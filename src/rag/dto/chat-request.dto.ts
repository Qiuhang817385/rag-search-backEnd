export class ChatRequestDto {
  /** 用户问题（同时用于向量检索与对话） */
  message!: string;

  /** 检索 topK 片段，默认 5 */
  topK?: number;

  /** 仅在该文档的切片中检索 */
  documentId?: string;
}
