import type { SearchHit } from './types';

export function buildContextFromHits(hits: SearchHit[]): string {
  if (!hits.length) {
    return '（当前未检索到任何知识库片段。）';
  }
  return hits
    .map(
      (h, i) =>
        `[片段 ${i + 1}]（documentId=${h.documentId}, chunkIndex=${h.chunkIndex}, score≈${h.score.toFixed(4)}）\n${h.content}`,
    )
    .join('\n\n---\n\n');
}

// export const RAG_SYSTEM_INSTRUCTION = `你是严谨的问答助手。用户问题附带若干「知识库片段」，你只能基于这些片段作答。
// 规则：
// - 事实必须以片段为准；片段里没有的信息请明确说「知识库中未提及」，不要编造。
// - 可适当归纳、转述，但不要引入片段外的具体事实。
// - 回答使用用户提问的语言（通常为中文）。`;
export const RAG_SYSTEM_INSTRUCTION = `你是严谨的问答助手。`;
