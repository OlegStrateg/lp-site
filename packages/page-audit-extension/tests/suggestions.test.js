import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSuggestionRequest, validateSuggestionResponse, suggestionReadiness, SUGGESTION_LIMITS } from '../src/suggestions.js';

const finding = {
  ruleId: 'oversized_image', category: 'images', severity: 'high', confidence: 'high',
  priorityScore: 85, affectedCount: 12, fact: '12 affected elements.', impact: 'Excess bytes.',
  fixability: 'safe-candidate', verification: 'Compare dimensions and bytes.',
  evidence: Array.from({ length: 8 }, (_, i) => ({ id: `img-${i}`, fact: `sample-${i}` })),
};

test('request is bounded to one finding and three evidence samples', () => {
  const request = buildSuggestionRequest(finding, { url: 'https://example.com', seo: { title: 'Example' } });
  assert.equal(request.task, 'propose_fix_only');
  assert.equal(request.constraints.noApply, true);
  assert.equal(request.finding.evidence.length, 3);
  assert.equal(SUGGESTION_LIMITS.maxEvidence, 3);
  assert.equal('images' in request.page, false);
  assert.equal('resources' in request.page, false);
});

test('review-only rules cannot return direct suggestion status', () => {
  const response = { status: 'suggestion', summary: 'x', rationale: 'x', proposedChange: 'x', target: null, verificationPlan: 'x', assumptions: [] };
  const result = validateSuggestionResponse(response, { ruleId: 'noindex' });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /review_required/);
});

test('structured response validates for safe candidate', () => {
  const response = { status: 'suggestion', summary: 'Resize image', rationale: 'Oversized source', proposedChange: 'Generate bounded responsive variant', target: 'img-1', verificationPlan: 'Compare bytes and rendered dimensions', assumptions: [] };
  assert.equal(validateSuggestionResponse(response, finding).valid, true);
});

test('low-confidence finding is not suggestion-ready', () => {
  assert.equal(suggestionReadiness({ ruleId: 'x', confidence: 'low' }).ready, false);
});
