# 后端里程碑说明（RAG / OceanBase / NestJS）

> 文档沉淀日期：2026-04-29  
> 范围：**仅 `back_end`**（前端 `my-app` 另见该仓库内页面与 `lib/rag-api.ts`）。

---

## 1. 定位与能力概览

| 能力 | 说明 |
|------|------|
| 文档入库 | 接收全文 → LangChain 切片 → 每块调用 Embedding → 写入 OceanBase（`rag_documents` / `rag_chunks`） |
| 向量检索 | 对 `query` 做 embedding，与库内 `Chunk.embedding` 做余弦相似度，返回 top-k |
| RAG 对话 | 内部复用同一套检索 → 拼 system 上下文 → `ChatDeepSeek` 流式生成 → **SSE** 推送到客户端 |
| Embedding HTTP | 独立调试接口，Key 仅服务端持有 |

---

## 2. 技术栈

- **框架**：NestJS 11  
- **ORM**：Prisma 6 + MySQL（对接 **OceanBase MySQL 兼容模式**）  
- **向量 / 模型**：OpenAI 官方 SDK（兼容 DashScope 等 OpenAI 兼容网关）、`@langchain/deepseek`、`@langchain/textsplitters`、`@langchain/core`  
- **配置**：`dotenv`（`main.ts` 首行 `import 'dotenv/config'`）

---

## 3. 目录结构（`src/`）

```
src/
  main.ts                 # 全局前缀 /api、CORS、PORT
  app.module.ts           # 聚合模块
  app.controller.ts       # GET /（不受 /api 前缀）
  prisma/                 # PrismaService + PrismaModule（@Global）
  embedding/              # POST /api/embedding
  documents/              # POST /api/documents/ingest
  rag/                    # POST /api/rag/search、POST /api/rag/chat（SSE）
```

---

## 4. HTTP 接口一览

全局前缀：`/api`（`main.ts` 中 `setGlobalPrefix('api')`）。根路径 `GET /` 为欢迎页，**不参与** `/api` 前缀。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 健康 / 欢迎（AppController） |
| POST | `/api/embedding` | Body: `{ text }` → 返回 embedding、dimensions、model |
| POST | `/api/documents/ingest` | Body: `{ text, filename? }` → 切片 + 向量 + 落库 |
| POST | `/api/rag/search` | Body: `{ query, topK?, documentId? }` → 仅检索，JSON |
| POST | `/api/rag/chat` | Body: `{ message, topK?, documentId? }` → **SSE** `text/event-stream` |

### 4.1 SSE（`/api/rag/chat`）

- 每行：`data: <单行 JSON>\n\n`  
- 事件类型（节选）：`meta`（检索摘要）、`token`（正文增量）、`reasoning`（推理文本）、`content_block`（多模态/结构化块）、`tool_call_delta`、`done`、`error`  
- 解析与归一化逻辑：`src/rag/stream-utils.ts`（`parseStreamPartsFromChunk`）

---

## 5. 数据模型（Prisma）

| 表名（@@map） | 模型 | 要点 |
|---------------|------|------|
| `rag_documents` | Document | `id`（cuid）、`filename`、`rawText`、`chunks` |
| `rag_chunks` | Chunk | `documentId` 外键级联删除、`chunkIndex`、`content`、`embedding`（Json 数组） |

Schema 文件：`prisma/schema.prisma`。  
OceanBase 若对迁移敏感，开发期可用 `pnpm run prisma:push` 同步结构。

---

## 6. 环境变量（`.env`）

以下为**约定名称**（实际以 `.env` 为准，勿将密钥提交仓库）。

| 变量 | 用途 |
|------|------|
| `DATABASE_URL` | MySQL 连接串（OceanBase） |
| `PORT` | 服务端口，默认 `3010` |
| `EMBEDDING_APIKEY` / `OPENAI_API_KEY` | 嵌入接口密钥 |
| `BASE_URL` | 嵌入等 OpenAI 兼容 **baseURL**（如 DashScope compatible-mode） |
| `EMBEDDING_MODEL`、`DIMENSIONS` | 嵌入模型与维度 |
| `CHAT_API_KEY` 或 `DEEPSEEK_API_KEY` | **对话**模型密钥 |
| `CHAT_BASE_URL` 或 `BASE_URL` | 对话网关（与百炼/官方 DeepSeek 文档对齐） |
| `CHAT_MODEL` | 对话模型名（默认 `deepseek-chat`） |
| `CHAT_TEMPERATURE` | 可选，默认约 `0.3` |

401 类错误通常来自 **Key / BaseURL / 模型名** 与云厂商控制台不一致，而非路由错误。

---

## 7. RAG 核心流程（后端）

### 7.1 入库（DocumentsService）

1. `RecursiveCharacterTextSplitter` 切片（参数见 `rag-split.constants.ts`，需与前端预览策略对齐）。  
2. 顺序 `EmbeddingService.embed(chunk)`。  
3. `prisma.document.create` 嵌套写入 `chunks`（含 `embedding`）。

### 7.2 检索复用（RagService）

- `retrieveTopK(queryText, topK, documentId?)`：向量化查询 → `findMany` chunks → 余弦相似度 → 排序截断。  
- `search()`：对外 JSON，内部调用 `retrieveTopK`。  
- `chatSseLines()`：先 `retrieveTopK`，再拼 `prompt.ts` 中系统说明 + 片段，再 `ChatDeepSeek.stream`。

### 7.3 相似度

- `src/rag/similarity.ts`：`cosineSimilarity`、`parseEmbeddingJson`。

---

## 8. npm 脚本（Prisma）

| 命令 | 含义 |
|------|------|
| `pnpm run prisma:generate` | 生成 Client |
| `pnpm run prisma:push` | 将 schema 推到数据库（适合 OB 调试） |
| `pnpm run prisma:migrate` | 开发迁移 |
| `pnpm run prisma:studio` | Prisma Studio |

---

## 9. 已知约束与说明

- **OceanBase**：部分 DDL / `migrate dev` 可能与 Prisma 迁移引擎不完全兼容时，优先 **`db push`** 或人工对齐表结构。  
- **主键**：Document/Chunk 使用 `cuid()`，避免部分环境下 `DEFAULT(uuid())` 不兼容。  
- **检索规模**：当前为应用层全量扫 chunk 算相似度；数据量增大后需向量索引或专用向量库（里程碑外演进）。

---

## 10. 与前端协作要点（仅索引）

- 前端 API 封装：`my-app/lib/rag-api.ts`（origin：`NEXT_PUBLIC_API_URL`）。  
- 上传全文走 `POST /api/documents/ingest`；检索页、对话流式页各自调用 `search` / `chat`。

---

## 11. 里程碑边界（当前后端已完成）

- [x] 全局 `/api`、CORS  
- [x] Prisma + OceanBase 表结构 + 入库含 embedding  
- [x] Embedding HTTP  
- [x] 向量检索 API  
- [x] RAG 对话 + SSE + 流式内容多形态解析（`stream-utils`）  
- [ ] 生产级鉴权、限流、观测、会话持久化（未在本里程碑范围）

---

*本文随架构变更请同步更新提交说明或 PR 描述。*
