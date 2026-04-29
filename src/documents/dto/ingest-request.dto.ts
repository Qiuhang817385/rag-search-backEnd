export class IngestRequestDto {
  /** 文档全文（TXT / Markdown 纯文本） */
  text!: string;

  /** 可选，原始文件名，便于展示与追溯 */
  filename?: string;
}
