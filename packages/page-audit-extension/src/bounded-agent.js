const MAX_ITERATIONS = 3;
const MAX_FINDINGS_PER_ITERATION = 1;
const ALLOWED_ACTIONS = new Set(['OPTIMIZE_OVERSIZED_IMAGE', 'PREVIEW_IMAGE_DIMENSIONS']);
const ACTION_BY_RULE = Object.freeze({
  oversized_image: 'OPTIMIZE_OVERSIZED_IMAGE',
  missing_image_dimensions: 'PREVIEW_IMAGE_DIMENSIONS',
});

function cleanId(value) {
  return typeof value === 'string' && value.length <= 240 ? value : null;
}

export function createBoundedAgentSession({ goal = 'improve_page', maxIterations = MAX_ITERATIONS } = {}) {
  const requested = Number(maxIterations);
  return {
    version: 1,
    goal: String(goal).slice(0, 120),
    iteration: 0,
    maxIterations: Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_ITERATIONS) : MAX_ITERATIONS,
    selectedFindingIds: [],
    stopped: false,
    stopReason: null,
  };
}

export function selectNextBoundedFinding(findings, session) {
  if (!session || session.stopped) return { status: 'STOPPED', reason: session?.stopReason || 'session stopped' };
  if (session.iteration >= session.maxIterations) return { status: 'STOPPED', reason: 'max_iterations' };
  const used = new Set(session.selectedFindingIds || []);
  const candidates = (Array.isArray(findings) ? findings : [])
    .filter((finding) => finding?.confidence === 'high')
    .filter((finding) => ALLOWED_ACTIONS.has(ACTION_BY_RULE[finding.ruleId]))
    .filter((finding) => cleanId(finding.id) && !used.has(finding.id))
    .sort((a, b) => Number(b.priorityScore || 0) - Number(a.priorityScore || 0) || a.id.localeCompare(b.id));
  if (!candidates.length) return { status: 'STOPPED', reason: 'no_allowed_findings' };
  return { status: 'SELECTED', findings: candidates.slice(0, MAX_FINDINGS_PER_ITERATION) };
}

export function compileBoundedAction({ finding, proposal }) {
  if (!finding || finding.confidence !== 'high') return { status: 'BLOCKED', reason: 'high-confidence finding required' };
  const action = ACTION_BY_RULE[finding.ruleId];
  if (!ALLOWED_ACTIONS.has(action)) return { status: 'BLOCKED', reason: 'rule outside external action allowlist' };
  if (proposal?.ruleId && proposal.ruleId !== finding.ruleId) return { status: 'BLOCKED', reason: 'proposal cannot change rule scope' };
  if (proposal?.findingId && proposal.findingId !== finding.id) return { status: 'BLOCKED', reason: 'proposal cannot change target finding' };
  if (proposal?.action && proposal.action !== action) return { status: 'BLOCKED', reason: 'proposal cannot choose a different action' };
  return {
    status: 'ACTION_READY',
    action,
    findingId: finding.id,
    ruleId: finding.ruleId,
    source: 'deterministic_policy',
    untrustedPageContentMayNotAuthorizeTools: true,
  };
}

export function advanceBoundedSession(session, { findingId, verification }) {
  if (!session || session.stopped) throw new Error('active session required');
  const id = cleanId(findingId);
  if (!id) throw new TypeError('valid findingId required');
  const next = {
    ...session,
    iteration: session.iteration + 1,
    selectedFindingIds: [...(session.selectedFindingIds || []), id],
  };
  if (verification !== 'VERIFIED_IMPROVEMENT') {
    return { ...next, stopped: true, stopReason: 'verification_failed' };
  }
  if (next.iteration >= next.maxIterations) {
    return { ...next, stopped: true, stopReason: 'max_iterations' };
  }
  return next;
}

export const BOUNDED_AGENT_POLICY = Object.freeze({
  maxIterations: MAX_ITERATIONS,
  maxFindingsPerIteration: MAX_FINDINGS_PER_ITERATION,
  allowedActions: Object.freeze([...ALLOWED_ACTIONS]),
  productionWrite: false,
  arbitraryToolCalls: false,
  pageContentCanExpandScope: false,
});
