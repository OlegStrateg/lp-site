function activationMs(liveActivatedAt) {
  const ms = Date.parse(liveActivatedAt || '');
  return Number.isFinite(ms) ? ms : null;
}

function findLiveRuntimeError(memory, liveActivatedAt) {
  const gateMs = activationMs(liveActivatedAt);
  if (gateMs == null) return null;

  return [...(memory.runLog || [])].reverse().find((run) => {
    if (run?.status !== 'error') return false;
    if (run?.metadata?.writeMode !== 'live') return false;
    const startedAtMs = Date.parse(run.startedAt || '');
    return Number.isFinite(startedAtMs) && startedAtMs >= gateMs;
  }) || null;
}

function findLiveWriteFailure(memory, liveActivatedAt) {
  const gateMs = activationMs(liveActivatedAt);
  if (gateMs == null) return null;

  return Object.values(memory.actions || {}).find((action) => {
    if (action?.status !== 'failed') return false;
    const atMs = Date.parse(action.createdAt || action.updatedAt || '');
    return Number.isFinite(atMs) && atMs >= gateMs;
  }) || null;
}

export function evaluateLiveSafety(memory, config, now = new Date()) {
  if (config.writeMode !== 'live') return { allowed: false, reason: 'dry_run' };

  const gateMs = activationMs(config.liveActivatedAt);
  if (gateMs == null) return { allowed: false, reason: 'live_activation_missing' };
  if (now.getTime() < gateMs) return { allowed: false, reason: 'live_activation_not_reached' };

  if (config.liveHardStopAt && now.getTime() >= Date.parse(config.liveHardStopAt)) {
    return { allowed: false, reason: 'live_hard_stop_reached' };
  }

  if (memory.pilot?.liveEndsAt && now.getTime() >= Date.parse(memory.pilot.liveEndsAt)) {
    return { allowed: false, reason: 'pilot_window_complete' };
  }

  const unsafeAction = Object.values(memory.actions || {}).find((action) =>
    ['uncertain', 'published_unverified'].includes(action.status),
  );
  if (unsafeAction) {
    return { allowed: false, reason: 'unsafe_previous_publication', actionId: unsafeAction.id || null };
  }

  const writeFailure = findLiveWriteFailure(memory, config.liveActivatedAt);
  if (writeFailure) {
    return {
      allowed: false,
      reason: 'live_circuit_breaker_write_failure',
      actionId: writeFailure.id || null,
    };
  }

  const runtimeError = findLiveRuntimeError(memory, config.liveActivatedAt);
  if (runtimeError) {
    return {
      allowed: false,
      reason: 'live_circuit_breaker_runtime_error',
      runId: runtimeError.runId || null,
    };
  }

  const recommendation = memory.pilot?.latestSnapshot?.strategyRecommendation || null;
  if (recommendation === 'STOP_AND_REVIEW') return { allowed: false, reason: 'pilot_stop_and_review' };
  if (recommendation === 'REVIEW_RUNTIME_RELIABILITY') return { allowed: false, reason: 'runtime_reliability_review' };

  return { allowed: true, reason: null };
}
