export const RUNTIME_AUDIT_REQUEST_PATH = 'packages/layerporter-agent/runtime-audit-request.json';

export function classifyBuildChange(paths = []) {
  const changed = [...new Set(paths.map((path) => String(path || '').trim()).filter(Boolean))];
  if (changed.length === 0) return 'unknown';
  if (changed.every((path) => path === RUNTIME_AUDIT_REQUEST_PATH)) return 'audit_request_only';

  const touchesAgent = changed.some((path) =>
    path === 'wrangler-layerporter-agent.toml.example' ||
    path.startsWith('packages/layerporter-agent/'),
  );

  return touchesAgent ? 'agent_change' : 'unrelated';
}
