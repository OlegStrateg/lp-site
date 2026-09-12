function actionOccurredAfter(action, isoTimestamp) {
  if (!isoTimestamp) return true;
  const gateMs = Date.parse(isoTimestamp);
  const actionMs = Date.parse(action?.createdAt || action?.updatedAt || '');
  return Number.isFinite(actionMs) && actionMs >= gateMs;
}

export function evaluateLiveSafety(memory, config, now = new Date()) {
  if (config.writeMode !== 'live') return { allowed: false, reason: 'dry_run' };

  if (config.liveHardStopAt && now.getTime() >= Date.parse(config.liveHardStopAt)) {
    return { allowed: false, reason: 'live_hard_stop_reached' };
  }

  const liveStartedAt = memory.pilot?.liveStartedAt || null;
  if (memory.pilot?.liveEndsAt && now.getTime() >= Date.parse(memory.pilot.liveEndsAt)) {
    return { allowed: false, reason: 'pilot_window_complete' };
  }

  const unsafeAction = Object.values(memory.actions || {}).find((action) =>
    actionOccurredAfter(action, liveStartedAt)
    && ['uncertain', 'published_unverified'].includes(action.status),
  );
  if (unsafeAction) {
    return { allowed: false, reason: 'unsafe_previous_publication', actionId: unsafeAction.id || null };
  }

  const recommendation = memory.pilot?.latestSnapshot?.strategyRecommendation || null;
  if (recommendation === 'STOP_AND_REVIEW') return { allowed: false, reason: 'pilot_stop_and_review' };
  if (recommendation === 'REVIEW_RUNTIME_RELIABILITY') return { allowed: false, reason: 'runtime_reliability_review' };

  return { allowed: true, reason: null };
}
