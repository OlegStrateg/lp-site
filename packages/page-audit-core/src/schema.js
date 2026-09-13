export const AUDIT_DIRECTIONS = Object.freeze(['seo', 'ai_search', 'cro', 'images_performance']);
export const COVERAGE_STATES = Object.freeze(['checked', 'not_checked', 'not_available']);
export const PRIORITY_LEVELS = Object.freeze(['critical', 'high', 'medium', 'low']);

const directionSet = new Set(AUDIT_DIRECTIONS);
const coverageSet = new Set(COVERAGE_STATES);
const prioritySet = new Set(PRIORITY_LEVELS);

export function createEvidence(type, value, source = 'static_html') {
  if (!type || value === undefined || value === null) throw new Error('evidence requires type and value');
  return { type: String(type), value, source: String(source) };
}

export function createFinding(input) {
  if (!input?.id) throw new Error('finding.id is required');
  if (!directionSet.has(input.direction)) throw new Error(`invalid finding.direction: ${input.direction}`);
  if (!prioritySet.has(input.priority?.level)) throw new Error(`invalid finding.priority.level: ${input.priority?.level}`);
  if (!input.priority?.reason) throw new Error('finding.priority.reason is required');
  if (!input.observation) throw new Error('finding.observation is required');
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) throw new Error('finding.evidence must be non-empty');
  if (!input.action) throw new Error('finding.action is required');
  if (!input.verification) throw new Error('finding.verification is required');

  return {
    id: String(input.id),
    direction: input.direction,
    url: input.url ? String(input.url) : null,
    element: input.element ? String(input.element) : null,
    observation: String(input.observation),
    evidence: input.evidence,
    priority: { level: input.priority.level, reason: String(input.priority.reason) },
    action: String(input.action),
    verification: String(input.verification),
    automation: input.automation ?? { status: 'review', reason: 'No automation status supplied.' },
    limitations: Array.isArray(input.limitations) ? input.limitations.map(String) : [],
  };
}

export function createCoverage(state, evidence = null, note = null) {
  if (!coverageSet.has(state)) throw new Error(`invalid coverage state: ${state}`);
  return {
    state,
    ...(evidence ? { evidence } : {}),
    ...(note ? { note: String(note) } : {}),
  };
}

export function createChange(input) {
  if (!input?.id || !input?.findingId || !input?.path || !input?.summary) {
    throw new Error('change requires id, findingId, path and summary');
  }
  return {
    id: String(input.id),
    findingId: String(input.findingId),
    path: String(input.path),
    summary: String(input.summary),
    reversible: input.reversible !== false,
    verification: String(input.verification ?? ''),
    status: String(input.status ?? 'proposed'),
  };
}

export function createOutput(input) {
  if (!input?.kind || !input?.name) throw new Error('output requires kind and name');
  return {
    kind: String(input.kind),
    name: String(input.name),
    status: String(input.status ?? 'prepared'),
    mime: input.mime ? String(input.mime) : null,
    bytes: Number.isFinite(input.bytes) ? input.bytes : null,
    sha256: input.sha256 ? String(input.sha256) : null,
    path: input.path ? String(input.path) : null,
  };
}
