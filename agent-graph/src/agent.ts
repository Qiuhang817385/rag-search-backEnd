import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { copilotkitMiddleware } from '@copilotkit/sdk-js/langgraph';

import { AGENT_SYSTEM_PROMPT } from './prompts/system.js';
import { echoTool } from './tools/echo.js';
import { getCurrentTimeTool } from './tools/get-current-time.js';

export { GRAPH_USES_CHECKPOINTER } from './agent-meta.js';

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL ?? process.env.CHAT_MODEL ?? 'deepseek-chat',
  apiKey:
    process.env.OPENAI_API_KEY ??
    process.env.DEEPSEEK_API_KEY ??
    process.env.CHAT_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.deepseek.com/v1',
  },
  temperature: Number(
    process.env.OPENAI_TEMPERATURE ?? process.env.CHAT_TEMPERATURE ?? 0.3,
  ),
});

export const graph = createAgent({
  model,
  tools: [getCurrentTimeTool, echoTool],
  middleware: [copilotkitMiddleware],
  systemPrompt: AGENT_SYSTEM_PROMPT,
});
