import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BACKEND_TOOL_NAMES,
  FORBIDDEN_BACKEND_TOOL_NAMES,
  listBackendToolNames,
} from './tools/registry';

describe('backend tool registry', () => {
  it('仅包含安全后端工具', () => {
    assert.deepEqual(listBackendToolNames(), ['get_current_time', 'echo']);
  });

  it('不包含自动 shell 工具名', () => {
    for (const forbidden of FORBIDDEN_BACKEND_TOOL_NAMES) {
      assert.equal(
        (BACKEND_TOOL_NAMES as readonly string[]).includes(forbidden),
        false,
        `must not register ${forbidden}`,
      );
    }
  });
});
