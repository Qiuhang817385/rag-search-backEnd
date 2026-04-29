export class SearchRequestDto {
  /** 用户问题（会做 embedding 再与库内向量比相似度） */
  query!: string;

  /** 返回前几条，默认 5，最大 20 */
  topK?: number;

  /** 若指定则只在该文档的切片里检索 */
  documentId?: string;
}
