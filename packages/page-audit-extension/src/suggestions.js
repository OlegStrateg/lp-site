const MAX_EVIDENCE = 3;
const MAX_TEXT = 600;

const REVIEW_ONLY_RULES = new Set([
  'missing_title',
  'missing_meta_description',
  'missing_h1',
  'multiple_h1',
  'missing_canonical',
  'noindex',
  'hero_lazy',
]);

function trimText(value, max = MAX_TEXT) {
  const text = String(value ?? '').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function buildSuggestionRequest(finding, page = {}) {
  if (!finding?.ruleId) throw new TypeError('finding.ruleId is required');

  const evidence = (finding.evidence ?? []).slice(0, MAX_EVIDENCE).map((item) => ({
    id: trimText(item.id, 180),
    fact: trimText(item.fact),
  }));

  return {
    contractVersion: 1,
    task: 'propose_fix_only',
    constraints: {
      noApply: true,
      noScopeExpansion: true,
      noUnsupportedClaims: true,
      maxEvidenceItems: MAX_EVIDENCE,
    },
    page: {
      url: trimText(page.url, 500),
      title: trimText(page?.seo?.title, 240),
    },
    finding: {
      ruleId: finding.ruleId,
      category: finding.category,
      severity: finding.severity,
      confidence: finding.confidence,
      priorityScore: finding.priorityScore,
      affectedCount: finding.affectedCount,
      fact: trimText(finding.fact),
      impact: trimText(finding.impact),
      fixability: finding.fixability,
      verification: trimText(finding.verification),
      evidence,
    },
    requiredOutput: {
      status: ['suggestion', 'review_required', 'insufficient_evidence'],
      summary: 'string',
      rationale: 'string',
      proposedChange: 'string',
      target: 'string|null',
      verificationPlan: 'string',
      assumptions: 'string[]',
    },
  };
}

export function validateSuggestionResponse(response, finding) {
  const errors = [];
  const value = response && typeof response === 'object' ? response : {};
  const allowedStatuses = new Set(['suggestion', 'review_required', 'insufficient_evidence']);

  if (!allowedStatuses.has(value.status)) errors.push('invalid status');
  for (const key of ['summary', 'rationale', 'proposedChange', 'verificationPlan']) {
    if (typeof value[key] !== 'string' || !value[key].trim()) errors.push(`${key} is required`);
    if (typeof value[key] === 'string' && value[key].length > 1800) errors.push(`${key} is too long`);
  }
  if (!(value.target === null || typeof value.target === 'string')) errors.push('target must be string|null');
  if (!Array.isArray(value.assumptions) || value.assumptions.some((item) => typeof item !== 'string')) errors.push('assumptions must be string[]');
  if (Array.isArray(value.assumptions) && value.assumptions.length > 5) errors.push('too many assumptions');

  if (REVIEW_ONLY_RULES.has(finding?.ruleId) && value.status === 'suggestion') {
    errors.push('rule requires review_required status');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length ? null : {
      status: value.status,
      summary: trimText(value.summary, 1800),
      rationale: trimText(value.rationale, 1800),
      proposedChange: trimText(value.proposedChange, 1800),
      target: value.target === null ? null : trimText(value.target, 500),
      verificationPlan: trimText(value.verificationPlan, 1800),
      assumptions: value.assumptions.slice(0, 5).map((item) => trimText(item, 500)),
    },
  };
}

export function suggestionReadiness(finding) {
  if (!finding?.ruleId) return { ready: false, reason: 'missing finding' };
  if (finding.confidence === 'low') return { ready: false, reason: 'insufficient finding confidence' };
  return {
    ready: true,
    mode: REVIEW_ONLY_RULES.has(finding.ruleId) ? 'review_required' : 'suggestion',
  };
}

export const SUGGESTION_LIMITS = Object.freeze({ maxEvidence: MAX_EVIDENCE, maxText: MAX_TEXT });
