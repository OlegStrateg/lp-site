export function evaluateLiveSafety(memory, config, now = new Date()) {
  if (config.writeMode !== 'live') return { allowed: false, reason: 'dry_run' };

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

  const recommendation = memory.pilot?.latestSnapshot?.strategyRecommendation || null;
  if (recommendation === 'STOP_AND_REVIEW') return { allowed: false, reason: 'pilot_stop_and_review' };
  if (recommendation === 'REVIEW_RUNTIME_RELIABILITY') return { allowed: false, reason: 'runtime_reliability_review' };

  return { allowed: true, reason: null };
}
