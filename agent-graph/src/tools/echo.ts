import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const echoTool = tool(
  async ({ text }) => text,
  {
    name: 'echo',
    description: 'Echo the input text back unchanged. Useful for debugging.',
    schema: z.object({
      text: z.string().describe('Text to echo back'),
    }),
  },
);
