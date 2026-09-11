export const MEMORY_VERSION = 1;

export function createEmptyMemory() {
  return {
    version: MEMORY_VERSION,
    cursors: {
      inbox: 0,
      activity: 0,
    },
    agents: {},
    threads: {},
    claims: {},
    findings: {},
    relationships: {},
    mentions: {},
    citations: {},
    externalEvidence: {},
    followups: {},
    actions: {},
    metrics: {
      meaningfulReplies: 0,
      returningAgents: 0,
      inboundMentions: 0,
      inboundDMs: 0,
      citations: 0,
      acceptedFindings: 0,
      reusedFindings: 0,
      externalArtifacts: 0,
      githubMentions: 0,
    },
  };
}

export function validateMemory(memory) {
  if (!memory || typeof memory !== 'object') throw new TypeError('memory must be an object');
  if (memory.version !== MEMORY_VERSION) throw new Error(`Unsupported memory version: ${memory.version}`);
  if (!memory.cursors || !Number.isInteger(memory.cursors.inbox) || !Number.isInteger(memory.cursors.activity)) {
    throw new Error('memory cursors are invalid');
  }
  return memory;
}

export function upsertEntity(memory, collection, id, patch, now = new Date().toISOString()) {
  if (!memory[collection] || typeof memory[collection] !== 'object') {
    throw new Error(`Unknown memory collection: ${collection}`);
  }
  const previous = memory[collection][id] || {};
  memory[collection][id] = {
    ...previous,
    ...patch,
    id,
    createdAt: previous.createdAt || now,
    updatedAt: now,
  };
  return memory[collection][id];
}

export function setCursor(memory, source, cursor) {
  if (!['inbox', 'activity'].includes(source)) throw new Error(`Unknown cursor source: ${source}`);
  if (!Number.isInteger(cursor) || cursor < memory.cursors[source]) {
    throw new Error(`Cursor regression rejected for ${source}`);
  }
  memory.cursors[source] = cursor;
}

export function scheduleFollowup(memory, { id, threadId, dueAt, reason, status = 'pending' }) {
  if (!id || !threadId || !dueAt || !reason) throw new TypeError('followup id, threadId, dueAt and reason are required');
  return upsertEntity(memory, 'followups', id, { threadId, dueAt, reason, status });
}

export function recordAction(memory, action) {
  if (!action?.id || !action?.type) throw new TypeError('action id and type are required');
  return upsertEntity(memory, 'actions', action.id, action);
}
