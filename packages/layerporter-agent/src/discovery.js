import { matchesDiscoveryKeywords } from './config.js';
import { hasTerminalActionForSource } from './memory-schema.js';

function isFresh(summary, maxAgeHours, nowMs) {
  if (!summary?.created_at) return true;
  const createdMs = Number(summary.created_at) * 1000;
  if (!Number.isFinite(createdMs)) return true;
  return nowMs - createdMs <= maxAgeHours * 60 * 60 * 1000;
}

function isEligibleSummary(summary, { agentName, maxAgeHours, nowMs, memory, requireKeyword, keywords }) {
  if (!summary?.id || summary.author === agentName) return false;
  if (hasTerminalActionForSource(memory, summary.id)) return false;
  if (!isFresh(summary, maxAgeHours, nowMs)) return false;
  if (requireKeyword && !matchesDiscoveryKeywords(summary, keywords)) return false;
  return true;
}

async function hydrate(client, summary, source) {
  const current = await client.readMessage(summary.id, { limit: 30 });
  if (!current?.post?.id) throw new Error(`PostingBoard read-back missing post for ${summary.id}`);
  return {
    ...current.post,
    source,
    inbox_seq: summary.inbox_seq ?? null,
    inbox_reasons: summary.reasons ?? [],
  };
}

export async function collectDiscovery({ client, memory, config, agentName, now = new Date() }) {
  const nowMs = now.getTime();
  const inboxPage = await client.listInbox({
    after: memory.cursors.inbox,
    limit: config.inboxLimit,
  });

  const inboxSummaries = (inboxPage?.items || []).filter((summary) =>
    isEligibleSummary(summary, {
      agentName,
      maxAgeHours: config.maxSourceAgeHours,
      nowMs,
      memory,
      requireKeyword: false,
      keywords: config.keywords,
    }),
  );

  const activityPage = memory.cursors.activity > 0
    ? await client.listActivity({ after: memory.cursors.activity, limit: config.activityLimit })
    : await client.listActivity({ limit: config.activityLimit });

  const activitySummaries = (activityPage?.items || []).filter((summary) =>
    isEligibleSummary(summary, {
      agentName,
      maxAgeHours: config.maxSourceAgeHours,
      nowMs,
      memory,
      requireKeyword: true,
      keywords: config.keywords,
    }),
  );

  const ordered = [];
  const seen = new Set();
  for (const [source, summaries] of [['inbox', inboxSummaries], ['activity', activitySummaries]]) {
    for (const summary of summaries) {
      if (seen.has(summary.id)) continue;
      seen.add(summary.id);
      ordered.push({ source, summary });
      if (ordered.length >= config.maxCandidatesBeforeTriage) break;
    }
    if (ordered.length >= config.maxCandidatesBeforeTriage) break;
  }

  const messages = [];
  for (const item of ordered) {
    messages.push(await hydrate(client, item.summary, item.source));
  }

  return {
    inboxPage,
    activityPage,
    messages,
    counts: {
      inboxSeen: (inboxPage?.items || []).length,
      activitySeen: (activityPage?.items || []).length,
      hydrated: messages.length,
    },
  };
}
