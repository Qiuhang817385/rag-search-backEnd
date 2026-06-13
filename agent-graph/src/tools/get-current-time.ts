import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const getCurrentTimeTool = tool(
  async () => new Date().toISOString(),
  {
    name: 'get_current_time',
    description:
      'Get the current server date and time in ISO 8601 format (UTC).',
    schema: z.object({}),
  },
);
