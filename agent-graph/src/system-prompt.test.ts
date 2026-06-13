import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AGENT_SYSTEM_PROMPT } from './prompts/system';

describe('AGENT_SYSTEM_PROMPT', () => {
  it('要求本机问题走 humanApprovedCommand', () => {
    assert.match(AGENT_SYSTEM_PROMPT, /humanApprovedCommand/i);
    assert.match(AGENT_SYSTEM_PROMPT, /never guess|不得|MUST call/i);
  });

  it('禁止臆测命令输出', () => {
    assert.match(AGENT_SYSTEM_PROMPT, /Do not invent tool outputs/i);
  });
});
