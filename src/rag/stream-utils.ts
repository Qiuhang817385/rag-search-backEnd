/**
 * 将 LangChain 流式 AIMessageChunk 解析为前端可用的 SSE 载荷（支持文本 / 推理 / 多模态 / 工具增量）。
 * 与 LangChain ContentBlock、OpenAI 兼容片段、DeepSeek reasoning_content 等对齐。
 */

/** 单帧里可拆成多条 SSE（顺序发送） */
export type ParsedStreamPart =
  | { type: 'token'; text: string }
  | { type: 'reasoning'; text: string }
  | {
      type: 'content_block';
      /** LangChain block.type 或归一化类别：image | video | audio | file | citation | … */
      modality: string;
      /** 已脱敏：大段 base64 仅保留长度与 mimeType */
      payload: Record<string, unknown>;
    }
  | {
      type: 'tool_call_delta';
      name?: string;
      /** 流式参数片段 */
      argsChunk?: string;
      index?: string | number;
      callId?: string;
    };

const MAX_BASE64_PREVIEW = 128;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** 多模态 / 大块数据：避免把巨型 base64 塞进 SSE */
function sanitizeDataLike(
  part: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: part.id,
    mimeType: part.mimeType,
    url: typeof part.url === 'string' ? part.url : undefined,
    fileId: typeof part.fileId === 'string' ? part.fileId : undefined,
    title: typeof part.title === 'string' ? part.title : undefined,
    context: typeof part.context === 'string' ? part.context : undefined,
    text: typeof part.text === 'string' ? part.text : undefined,
  };
  if ('data' in part && part.data != null) {
    const d = part.data;
    if (typeof d === 'string') {
      out.dataLength = d.length;
      out.dataPreview =
        d.length > MAX_BASE64_PREVIEW
          ? `${d.slice(0, MAX_BASE64_PREVIEW)}…`
          : d;
    } else if (d instanceof Uint8Array) {
      out.dataByteLength = d.byteLength;
    } else {
      out.dataHint = typeof d;
    }
  }
  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined),
  );
}

function pushCitation(
  part: Record<string, unknown>,
  out: ParsedStreamPart[],
): void {
  out.push({
    type: 'content_block',
    modality: 'citation',
    payload: {
      source: part.source,
      url: part.url,
      title: part.title,
      startIndex: part.startIndex,
      endIndex: part.endIndex,
      citedText:
        typeof part.citedText === 'string'
          ? part.citedText.length > 500
            ? `${part.citedText.slice(0, 500)}…`
            : part.citedText
          : undefined,
    },
  });
}

function parseContentPart(part: unknown, out: ParsedStreamPart[]): void {
  if (typeof part === 'string') {
    if (part) {
      out.push({ type: 'token', text: part });
    }
    return;
  }
  if (!isRecord(part)) {
    return;
  }

  const t = part.type;
  if (t === 'text' && typeof part.text === 'string') {
    out.push({ type: 'token', text: part.text });
    return;
  }
  if (t === 'reasoning') {
    const r = part.reasoning;
    if (typeof r === 'string' && r) {
      out.push({ type: 'reasoning', text: r });
    }
    return;
  }
  if (t === 'citation') {
    pushCitation(part, out);
    return;
  }
  if (
    t === 'image' ||
    t === 'video' ||
    t === 'audio' ||
    t === 'file' ||
    t === 'text-plain'
  ) {
    out.push({
      type: 'content_block',
      modality: t,
      payload: sanitizeDataLike(part),
    });
    return;
  }
  if (t === 'tool_call' && isRecord(part.args)) {
    out.push({
      type: 'content_block',
      modality: 'tool_call',
      payload: {
        name: part.name,
        args: part.args,
      },
    });
    return;
  }
  if (t === 'tool_call_chunk') {
    out.push({
      type: 'tool_call_delta',
      name: typeof part.name === 'string' ? part.name : undefined,
      argsChunk: typeof part.args === 'string' ? part.args : undefined,
      index: part.index as string | number | undefined,
    });
    return;
  }
  if (t === 'non_standard' && isRecord(part.value)) {
    out.push({
      type: 'content_block',
      modality: 'non_standard',
      payload: { value: part.value },
    });
    return;
  }

  /* OpenAI 风格：image_url、input_text */
  if (t === 'image_url' && isRecord(part.image_url)) {
    const u = part.image_url.url;
    out.push({
      type: 'content_block',
      modality: 'image_url',
      payload: {
        url: typeof u === 'string' ? u : undefined,
        detail: part.image_url.detail,
      },
    });
    return;
  }

  if (typeof part.text === 'string' && part.text) {
    out.push({ type: 'token', text: part.text });
  }
}

/** 从 additional_kwargs 抽 DeepSeek 等 reasoning 流 */
function parseAdditionalKwargs(
  kw: Record<string, unknown> | undefined,
  out: ParsedStreamPart[],
): void {
  if (!kw) {
    return;
  }
  const rc = kw.reasoning_content;
  if (typeof rc === 'string' && rc) {
    out.push({ type: 'reasoning', text: rc });
  }
}

function parseToolCallChunks(
  chunks: unknown,
  out: ParsedStreamPart[],
): void {
  if (!Array.isArray(chunks)) {
    return;
  }
  for (const c of chunks) {
    if (!isRecord(c)) {
      continue;
    }
    out.push({
      type: 'tool_call_delta',
      name: typeof c.name === 'string' ? c.name : undefined,
      argsChunk: typeof c.args === 'string' ? c.args : undefined,
      index: c.index as string | number | undefined,
      callId: typeof c.id === 'string' ? c.id : undefined,
    });
  }
}

/**
 * 将单帧 stream chunk 拆成 0..n 条 ParsedStreamPart（同一帧内保持顺序）。
 */
export function parseStreamPartsFromChunk(chunk: unknown): ParsedStreamPart[] {
  const out: ParsedStreamPart[] = [];

  if (!isRecord(chunk)) {
    return out;
  }

  parseAdditionalKwargs(
    chunk.additional_kwargs as Record<string, unknown> | undefined,
    out,
  );
  parseToolCallChunks(chunk.tool_call_chunks, out);

  const content = chunk.content;
  if (typeof content === 'string') {
    if (content) {
      out.push({ type: 'token', text: content });
    }
    return dedupeAdjacentTokens(out);
  }

  if (Array.isArray(content)) {
    for (const part of content) {
      parseContentPart(part, out);
    }
    return dedupeAdjacentTokens(out);
  }

  return dedupeAdjacentTokens(out);
}

/** 合并连续相同 type 的 token 以减少 SSE 条数（可选优化） */
function dedupeAdjacentTokens(parts: ParsedStreamPart[]): ParsedStreamPart[] {
  const merged: ParsedStreamPart[] = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (
      p.type === 'token' &&
      last?.type === 'token' &&
      typeof p.text === 'string'
    ) {
      last.text += p.text;
    } else {
      merged.push({ ...p });
    }
  }
  return merged;
}

/** @deprecated 仅保留兼容；请使用 parseStreamPartsFromChunk */
export function deltaTextFromChunk(chunk: { content: unknown }): string {
  const parts = parseStreamPartsFromChunk(chunk);
  return parts
    .filter((p): p is { type: 'token'; text: string } => p.type === 'token')
    .map((p) => p.text)
    .join('');
}
