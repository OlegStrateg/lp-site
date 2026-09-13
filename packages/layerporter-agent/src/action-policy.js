import { isCompetency } from './identity.js';

export const ALLOWED_ACTIONS = Object.freeze([
  'reply',
  'create_thread',
  'save_only',
  'defer',
  'do_nothing',
]);

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}/i,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
];

export function detectSecretLikeText(text = '') {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

export function evaluateActionProposal(proposal, {
  minimumOpportunityScore = 0.72,
  minimumEvidenceScore = 0.82,
  maxBodyBytes = 8192,
} = {}) {
  const reasons = [];

  if (!proposal || typeof proposal !== 'object') reasons.push('proposal_missing');
  if (!ALLOWED_ACTIONS.includes(proposal?.action)) reasons.push('action_not_allowed');

  if (['save_only', 'defer', 'do_nothing'].includes(proposal?.action)) {
    return { allowed: reasons.length === 0, reasons };
  }

  if (!isCompetency(proposal?.competency)) reasons.push('outside_competency');
  if (!Number.isFinite(proposal?.opportunityScore) || proposal.opportunityScore < minimumOpportunityScore) {
    reasons.push('opportunity_below_threshold');
  }
  if (!Number.isFinite(proposal?.evidenceScore) || proposal.evidenceScore < minimumEvidenceScore) {
    reasons.push('evidence_below_threshold');
  }
  if (!Array.isArray(proposal?.evidence) || proposal.evidence.length === 0) reasons.push('evidence_missing');
  if (!proposal?.sourceMessageId) reasons.push('source_message_missing');
  if (!proposal?.sourceContentHash) reasons.push('source_hash_missing');
  if (!proposal?.sourceFetchedAt) reasons.push('source_freshness_missing');
  if (!proposal?.body || typeof proposal.body !== 'string') reasons.push('body_missing');

  if (proposal?.body) {
    if (Buffer.byteLength(proposal.body, 'utf8') > maxBodyBytes) reasons.push('body_too_large');
    if (detectSecretLikeText(proposal.body)) reasons.push('secret_like_text_detected');
  }

  if (proposal?.containsPrivateContext === true) reasons.push('private_context_flag');
  if (proposal?.requiresNewPermission === true) reasons.push('permission_expansion_requested');
  if (proposal?.claims?.some?.((claim) => claim.status === 'unverified' && claim.presentedAsFact)) {
    reasons.push('unverified_claim_presented_as_fact');
  }

  return { allowed: reasons.length === 0, reasons };
}

export function assertActionAllowed(proposal, options) {
  const result = evaluateActionProposal(proposal, options);
  if (!result.allowed) {
    const error = new Error(`Action blocked: ${result.reasons.join(', ')}`);
    error.code = 'ACTION_POLICY_BLOCKED';
    error.reasons = result.reasons;
    throw error;
  }
  return proposal;
}
