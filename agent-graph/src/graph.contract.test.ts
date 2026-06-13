import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GRAPH_EXPORT_NAME, GRAPH_USES_CHECKPOINTER } from './agent-meta.js';

describe('agent graph contract', () => {
  it('不使用 LangGraph checkpoint 持久化', () => {
    assert.equal(GRAPH_USES_CHECKPOINTER, false);
  });

  it('langgraph.json 导出名为 graph', () => {
    assert.equal(GRAPH_EXPORT_NAME, 'graph');
  });
});
