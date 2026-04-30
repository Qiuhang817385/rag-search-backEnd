export type SearchHit = {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  score: number;
};

/** 在 SearchHit 上附加 `rag_documents.filename`（无则回退为 documentId） */
export type SearchHitWithDocument = SearchHit & {
  documentName: string;
};
