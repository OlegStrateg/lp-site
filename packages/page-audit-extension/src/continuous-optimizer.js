import { compileBoundedAction } from './bounded-agent.js';

const MAX_RECENT_AUDIT_IDS = 50;
const ACTIONABLE_CLASSIFICATIONS = new Set(['NEW', 'REGRESSED']);

function cleanString(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

function findingKey(finding) {
  const ruleId = cleanString(finding?.ruleId, 120);
  if (!ruleId) return null;
  const scope = cleanString(finding?.scope, 40) || 'page';
  return `${scope}:${ruleId}`;
}

function countOf(finding) {
  const value = Number(finding?.affectedCount ?? 1);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function trend(previous, current) {
  if (!Number.isInteger(previous) || !Number.isInteger(current)) return null;
  if (current < previous) return 'IMPROVED';
  if (current > previous) return 'WORSENED';
  return 'UNCHANGED';
}

function findingRecord(finding) {
  return {
    ruleId: finding.ruleId,
    scope: finding.scope || 'page',
    severity: finding.severity || 'medium',
    confidence: finding.confidence || 'medium',
    priorityScore: Number(finding.priorityScore || 0),
    affectedCount: countOf(finding),
  };
}

export function createContinuousOptimizationState({ siteKey }) {
  const key = cleanString(siteKey, 240);
  if (!key) throw new TypeError('siteKey is required');
  return {
    version: 1,
    siteKey: key,
    runCount: 0,
    lastAuditId: null,
    recentAuditIds: [],
    records: {},
  };
}

export function reconcileContinuousAudit({ state, auditId, capturedAt, findings = [], auditStatus = 'COMPLETE' }) {
  if (!state || state.version !== 1 || !state.siteKey) throw new TypeError('valid continuous optimization state required');
  const id = cleanString(auditId, 160);
  if (!id) throw new TypeError('auditId is required');
  const at = cleanString(capturedAt, 80);
  if (!at) throw new TypeError('capturedAt is required');

  if (auditStatus !== 'COMPLETE') {
    return { status: 'INCONCLUSIVE_RUN', reason: 'audit_not_complete', state, events: [] };
  }

  if ((state.recentAuditIds || []).includes(id)) {
    return { status: 'DUPLICATE_RUN', reason: 'audit_already_reconciled', state, events: [] };
  }

  const current = new Map();
  for (const finding of Array.isArray(findings) ? findings : []) {
    const key = findingKey(finding);
    if (!key) throw new TypeError('finding.ruleId is required');
    if (current.has(key)) throw new Error(`duplicate normalized finding key: ${key}`);
    current.set(key, finding);
  }

  const previousRecords = state.records || {};
  const nextRecords = { ...previousRecords };
  const events = [];

  for (const [key, finding] of current) {
    const prior = previousRecords[key] || null;
    const classification = !prior ? 'NEW' : prior.status === 'RESOLVED' ? 'REGRESSED' : 'PERSISTING';
    const currentCount = countOf(finding);
    const countTrend = classification === 'PERSISTING' ? trend(prior.affectedCount, currentCount) : null;
    const recurrenceCount = Number(prior?.recurrenceCount || 0) + (classification === 'REGRESSED' ? 1 : 0);
    const compact = findingRecord(finding);

    nextRecords[key] = {
      ...compact,
      key,
      status: 'ACTIVE',
      firstSeenAt: prior?.firstSeenAt || at,
      lastSeenAt: at,
      resolvedAt: null,
      previousAffectedCount: prior?.affectedCount ?? null,
      recurrenceCount,
      lastClassification: classification,
    };

    events.push({
      key,
      classification,
      countTrend,
      previousAffectedCount: prior?.affectedCount ?? null,
      ...compact,
      recurrenceCount,
    });
  }

  for (const [key, prior] of Object.entries(previousRecords)) {
    if (prior.status !== 'ACTIVE' || current.has(key)) continue;
    nextRecords[key] = {
      ...prior,
      status: 'RESOLVED',
      resolvedAt: at,
      lastClassification: 'RESOLVED',
    };
    events.push({
      key,
      classification: 'RESOLVED',
      countTrend: null,
      previousAffectedCount: prior.affectedCount,
      affectedCount: 0,
      ruleId: prior.ruleId,
      scope: prior.scope,
      severity: prior.severity,
      confidence: prior.confidence,
      priorityScore: prior.priorityScore,
      recurrenceCount: prior.recurrenceCount || 0,
    });
  }

  const nextState = {
    ...state,
    runCount: state.runCount + 1,
    lastAuditId: id,
    recentAuditIds: [...(state.recentAuditIds || []), id].slice(-MAX_RECENT_AUDIT_IDS),
    records: nextRecords,
  };

  const order = { REGRESSED: 4, NEW: 3, PERSISTING: 2, RESOLVED: 1 };
  events.sort((a, b) => (order[b.classification] - order[a.classification]) || b.priorityScore - a.priorityScore || a.key.localeCompare(b.key));

  return { status: 'APPLIED', state: nextState, events };
}

export function buildContinuousReviewQueue({ reconciliation, findings = [] }) {
  if (!reconciliation || reconciliation.status !== 'APPLIED') return [];
  const byKey = new Map();
  for (const finding of Array.isArray(findings) ? findings : []) {
    const key = findingKey(finding);
    if (key) byKey.set(key, finding);
  }

  const queue = [];
  for (const event of reconciliation.events) {
    const worsenedPersistent = event.classification === 'PERSISTING' && event.countTrend === 'WORSENED';
    if (!ACTIONABLE_CLASSIFICATIONS.has(event.classification) && !worsenedPersistent) continue;

    const finding = byKey.get(event.key);
    const evidenceId = cleanString(finding?.evidence?.[0]?.id, 240);
    const policyFinding = evidenceId ? {
      id: evidenceId,
      ruleId: finding.ruleId,
      confidence: finding.confidence,
    } : null;
    const compiled = policyFinding
      ? compileBoundedAction({ finding: policyFinding })
      : { status: 'BLOCKED', reason: 'exact evidence target required' };

    queue.push({
      key: event.key,
      classification: event.classification,
      countTrend: event.countTrend,
      priorityScore: event.priorityScore,
      ruleId: event.ruleId,
      findingId: evidenceId,
      boundedPolicyStatus: compiled.status,
      boundedAction: compiled.status === 'ACTION_READY' ? compiled.action : null,
      reason: compiled.status === 'ACTION_READY' ? null : compiled.reason,
      executionAllowed: false,
      requiresBoundedAgentGate: true,
    });
  }

  return queue.sort((a, b) => b.priorityScore - a.priorityScore || a.key.localeCompare(b.key));
}

export const CONTINUOUS_OPTIMIZATION_POLICY = Object.freeze({
  autoExecute: false,
  productionWrite: false,
  schedulerIncluded: false,
  persistenceIncluded: false,
  pageContentCanAuthorizeActions: false,
  maxRecentAuditIds: MAX_RECENT_AUDIT_IDS,
  actionableClassifications: Object.freeze([...ACTIONABLE_CLASSIFICATIONS, 'PERSISTING_WORSENED']),
});
