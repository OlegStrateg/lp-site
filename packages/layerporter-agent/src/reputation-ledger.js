const REPUTATION_LEVELS = Object.freeze({
  notice: 1,
  trust: 2,
  citation: 3,
  adoption: 4,
  external_validation: 5,
});

const EVENT_TO_METRIC = Object.freeze({
  meaningful_reply: 'meaningfulReplies',
  returning_agent: 'returningAgents',
  inbound_mention: 'inboundMentions',
  inbound_dm: 'inboundDMs',
  citation: 'citations',
  accepted_finding: 'acceptedFindings',
  reused_finding: 'reusedFindings',
  external_artifact: 'externalArtifacts',
  github_mention: 'githubMentions',
});

const EVENT_TO_LEVEL = Object.freeze({
  reaction: REPUTATION_LEVELS.notice,
  meaningful_reply: REPUTATION_LEVELS.notice,
  returning_agent: REPUTATION_LEVELS.trust,
  inbound_mention: REPUTATION_LEVELS.trust,
  inbound_dm: REPUTATION_LEVELS.trust,
  citation: REPUTATION_LEVELS.citation,
  reused_finding: REPUTATION_LEVELS.adoption,
  accepted_finding: REPUTATION_LEVELS.adoption,
  external_artifact: REPUTATION_LEVELS.external_validation,
  github_mention: REPUTATION_LEVELS.external_validation,
});

export function recordReputationEvent(memory, event) {
  if (!event?.type || !EVENT_TO_LEVEL[event.type]) throw new TypeError(`Unknown reputation event: ${event?.type}`);
  const now = event.at || new Date().toISOString();
  const id = event.id || `${event.type}:${event.sourceId || 'unknown'}:${now}`;
  if (memory.externalEvidence[id]) return memory.externalEvidence[id];

  memory.externalEvidence[id] = {
    id,
    type: event.type,
    level: EVENT_TO_LEVEL[event.type],
    sourceId: event.sourceId || null,
    sourceUrl: event.sourceUrl || null,
    agentId: event.agentId || null,
    note: event.note || null,
    at: now,
  };
  const metric = EVENT_TO_METRIC[event.type];
  if (metric) memory.metrics[metric] = (memory.metrics[metric] || 0) + 1;
  return memory.externalEvidence[id];
}

export function highestReputationLevel(memory) {
  return Object.values(memory.externalEvidence || {}).reduce((max, event) => Math.max(max, event.level || 0), 0);
}

export function reputationSummary(memory) {
  const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const event of Object.values(memory.externalEvidence || {})) {
    if (byLevel[event.level] != null) byLevel[event.level] += 1;
  }
  return {
    highestLevel: highestReputationLevel(memory),
    byLevel,
    metrics: { ...memory.metrics },
  };
}

export { REPUTATION_LEVELS };
