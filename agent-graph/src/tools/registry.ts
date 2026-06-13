/** 后端注册的工具名（不得包含自动执行 shell 的工具） */
export const BACKEND_TOOL_NAMES = ['get_current_time', 'echo'] as const;

export const FORBIDDEN_BACKEND_TOOL_NAMES = [
  'run_bash',
  'execute_shell',
  'run_shell',
  'shell_execute',
] as const;

export function listBackendToolNames(): string[] {
  return [...BACKEND_TOOL_NAMES];
}
