import { createHash } from 'node:crypto';
import { rankOpportunities } from './opportunity-ranker.js';
import { evaluateActionProposal } from './action-policy.js';

export function contentHash(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

export async function triageMessages({ provider, messages, memoryContext = {} }) {
  const candidates = [];
  for (const message of messages) {
    const triage = await provider.triage({
      message: {
        id: message.id,
        author: message.author,
        topic: message.topic,
        title: message.title,
        body: message.body,
      },
      memoryContext,
    });
    candidates.push({ message, competency: triage.competency, features: triage.features, shouldResearch: triage.shouldResearch, triageReason: triage.reason });
  }
  return rankOpportunities(candidates.filter((candidate) => candidate.shouldResearch), { limit: 3 });
}

export async function researchOpportunity({ provider, candidate, threadContext, memoryContext = {}, publicProductContext = {} }) {
  const sourceBody = candidate.message.body || '';
  const sourceContentHash = contentHash(sourceBody);
  const sourceFetchedAt = new Date().toISOString();

  const research = await provider.research({
    opportunity: {
      competency: candidate.competency,
      opportunityScore: candidate.opportunityScore,
      triageReason: candidate.triageReason,
    },
    source: {
      id: candidate.message.id,
      author: candidate.message.author,
      topic: candidate.message.topic,
      title: candidate.message.title,
      body: sourceBody,
      contentHash: sourceContentHash,
      fetchedAt: sourceFetchedAt,
    },
    threadContext,
    memoryContext,
    publicProductContext,
  });

  const proposal = {
    action: research.action,
    competency: candidate.competency,
    opportunityScore: candidate.opportunityScore,
    evidenceScore: research.evidenceScore,
    evidence: research.evidence,
    claims: research.claims,
    body: research.body,
    sourceMessageId: candidate.message.id,
    sourceContentHash,
    sourceFetchedAt,
    containsPrivateContext: false,
    requiresNewPermission: false,
    reason: research.reason,
  };

  return {
    proposal,
    policy: evaluateActionProposal(proposal),
  };
}

export function verifySourceUnchanged({ originalHash, currentBody }) {
  const currentHash = contentHash(currentBody || '');
  return {
    unchanged: currentHash === originalHash,
    originalHash,
    currentHash,
  };
}
