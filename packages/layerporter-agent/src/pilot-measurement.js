import { reputationSummary } from './reputation-ledger.js';

const PILOT_ID = 'LP-097';
const PILOT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function zeroUsage() {
  return { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

function emptyBucket() {
  return {
    runs: 0,
    successfulRuns: 0,
    failedRuns: 0,
    inboxSeen: 0,
    activitySeen: 0,
    hydrated: 0,
    candidates: 0,
    researched: 0,
    writes: 0,
    modelUsage: zeroUsage(),
    errorCodes: {},
  };
}

function ensureDailyBucket(pilot, utcDate, writeMode) {
  if (!pilot.daily[utcDate]) {
    pilot.daily[utcDate] = { dryRun: emptyBucket(), live: emptyBucket() };
  }
  return pilot.daily[utcDate][writeMode === 'live' ? 'live' : 'dryRun'];
}

function metricDelta(current = {}, baseline = {}) {
  return Object.fromEntries(
    Object.keys(current).map((key) => [key, Math.max(0, Number(current[key] || 0) - Number(baseline[key] || 0))]),
  );
}

function actionsSince(memory, startedAt) {
  if (!startedAt) return [];
  const gate = Date.parse(startedAt);
  return Object.values(memory.actions || {}).filter((action) => Date.parse(action.createdAt || action.updatedAt || '') >= gate);
}

function runErrorsSince(memory, startedAt) {
  if (!startedAt) return 0;
  const gate = Date.parse(startedAt);
  return (memory.runLog || []).filter((run) => Date.parse(run.startedAt || '') >= gate && run.status === 'error').length;
}

function liveUsage(pilot) {
  const total = zeroUsage();
  for (const day of Object.values(pilot.daily || {})) {
    const usage = day?.live?.modelUsage || {};
    total.requests += Number(usage.requests || 0);
    total.inputTokens += Number(usage.inputTokens || 0);
    total.outputTokens += Number(usage.outputTokens || 0);
    total.totalTokens += Number(usage.totalTokens || 0);
  }
  return total;
}

function strategyRecommendation({ pilot, reputationDelta, actions, runtimeErrors, now }) {
  if (!pilot.liveStartedAt) return 'AWAIT_LIVE_GATE';

  const unsafePublicationState = actions.some((action) => ['uncertain', 'published_unverified'].includes(action.status));
  if (unsafePublicationState) return 'STOP_AND_REVIEW';
  if (runtimeErrors >= 3) return 'REVIEW_RUNTIME_RELIABILITY';

  const liveStartMs = Date.parse(pilot.liveStartedAt);
  const elapsedMs = Math.max(0, now.getTime() - liveStartMs);
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const l2Plus = Number(reputationDelta.returningAgents || 0)
    + Number(reputationDelta.inboundMentions || 0)
    + Number(reputationDelta.inboundDMs || 0);
  const l3Plus = Number(reputationDelta.citations || 0)
    + Number(reputationDelta.acceptedFindings || 0)
    + Number(reputationDelta.reusedFindings || 0)
    + Number(reputationDelta.externalArtifacts || 0)
    + Number(reputationDelta.githubMentions || 0);

  if (elapsedMs >= PILOT_WINDOW_MS) return 'PARETO_GATE_READY';
  if (l3Plus > 0) return 'HOLD_AND_ACCUMULATE_EVIDENCE';
  if (elapsedDays >= 7 && l2Plus > 0) return 'DEEPEN_FOLLOWUPS_AND_RECEIPTS';
  if (elapsedDays >= 3 && l2Plus === 0) return 'REVIEW_ROUTING_AND_TOPIC_FOCUS';
  return 'COLLECT_BASELINE';
}

export function preparePilotMeasurement(memory, { now = new Date(), writeMode = 'dry-run' } = {}) {
  const nowIso = now.toISOString();
  if (!memory.pilot) {
    memory.pilot = {
      id: PILOT_ID,
      measurementReadyAt: nowIso,
      liveStartedAt: null,
      liveEndsAt: null,
      baseline: null,
      daily: {},
      latestSnapshot: null,
      adaptations: [],
    };
  }

  if (writeMode === 'live' && !memory.pilot.liveStartedAt) {
    memory.pilot.liveStartedAt = nowIso;
    memory.pilot.liveEndsAt = new Date(now.getTime() + PILOT_WINDOW_MS).toISOString();
    memory.pilot.baseline = {
      capturedAt: nowIso,
      metrics: { ...(memory.metrics || {}) },
    };
  }
  return memory.pilot;
}

export function buildPilotSnapshot(memory, { now = new Date() } = {}) {
  const pilot = memory.pilot || preparePilotMeasurement(memory, { now, writeMode: 'dry-run' });
  const reputation = reputationSummary(memory);
  const baselineMetrics = pilot.baseline?.metrics || reputation.metrics;
  const reputationDelta = pilot.liveStartedAt ? metricDelta(reputation.metrics, baselineMetrics) : Object.fromEntries(Object.keys(reputation.metrics).map((key) => [key, 0]));
  const actions = actionsSince(memory, pilot.liveStartedAt);
  const runtimeErrors = runErrorsSince(memory, pilot.liveStartedAt);
  const uniqueInboundAgents = pilot.liveStartedAt
    ? Object.values(memory.relationships || {}).filter((relationship) => Date.parse(relationship.lastInteractionAt || '') >= Date.parse(pilot.liveStartedAt)).length
    : 0;
  const l2Plus = Number(reputationDelta.returningAgents || 0) + Number(reputationDelta.inboundMentions || 0) + Number(reputationDelta.inboundDMs || 0);
  const l3Plus = Number(reputationDelta.citations || 0) + Number(reputationDelta.acceptedFindings || 0) + Number(reputationDelta.reusedFindings || 0) + Number(reputationDelta.externalArtifacts || 0) + Number(reputationDelta.githubMentions || 0);
  const publishedActions = actions.filter((action) => ['published', 'published_unverified', 'uncertain'].includes(action.status)).length;

  return {
    at: now.toISOString(),
    id: pilot.id,
    measurementReadyAt: pilot.measurementReadyAt,
    liveStartedAt: pilot.liveStartedAt,
    liveEndsAt: pilot.liveEndsAt,
    liveWindowComplete: Boolean(pilot.liveEndsAt && now.getTime() >= Date.parse(pilot.liveEndsAt)),
    uniqueInboundAgents,
    reputation: {
      highestLevelAllTime: reputation.highestLevel,
      allTimeByLevel: reputation.byLevel,
      liveMetricDelta: reputationDelta,
      l2PlusEvents: l2Plus,
      l3PlusEvents: l3Plus,
    },
    guardrails: {
      runtimeErrors,
      failedActions: actions.filter((action) => action.status === 'failed').length,
      uncertainActions: actions.filter((action) => action.status === 'uncertain').length,
      publishedUnverifiedActions: actions.filter((action) => action.status === 'published_unverified').length,
    },
    output: {
      publishedActions,
      modelUsage: liveUsage(pilot),
      exactCostUsd: null,
    },
    strategyRecommendation: strategyRecommendation({ pilot, reputationDelta, actions, runtimeErrors, now }),
  };
}

export function recordPilotRun(memory, {
  at = new Date(),
  writeMode = 'dry-run',
  status = 'ok',
  counters = {},
  usage = {},
  errorCode = null,
} = {}) {
  const pilot = preparePilotMeasurement(memory, { now: at, writeMode });
  const bucket = ensureDailyBucket(pilot, at.toISOString().slice(0, 10), writeMode);
  bucket.runs += 1;
  if (status === 'ok') bucket.successfulRuns += 1;
  else bucket.failedRuns += 1;
  for (const key of ['inboxSeen', 'activitySeen', 'hydrated', 'candidates', 'researched']) {
    bucket[key] += Number(counters[key] || 0);
  }
  bucket.writes += Number(counters.writesThisRun || counters.writes || 0);
  bucket.modelUsage.requests += Number(usage.requests || 0);
  bucket.modelUsage.inputTokens += Number(usage.inputTokens || 0);
  bucket.modelUsage.outputTokens += Number(usage.outputTokens || 0);
  bucket.modelUsage.totalTokens += Number(usage.totalTokens || 0);
  if (errorCode) bucket.errorCodes[errorCode] = Number(bucket.errorCodes[errorCode] || 0) + 1;

  pilot.latestSnapshot = buildPilotSnapshot(memory, { now: at });
  return pilot.latestSnapshot;
}

export { PILOT_ID, PILOT_WINDOW_MS };
