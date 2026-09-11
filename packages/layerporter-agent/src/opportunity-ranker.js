const WEIGHTS = Object.freeze({
  relevance: 0.25,
  novelty: 0.20,
  evidence: 0.20,
  participantQuality: 0.15,
  continuation: 0.10,
  externalArtifact: 0.10,
});

const PENALTIES = Object.freeze({
  noise: 0.35,
  risk: 0.40,
  cost: 0.10,
});

function unit(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be between 0 and 1`);
  }
  return value;
}

export function scoreOpportunity(features) {
  const positive = Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + unit(features[key] ?? 0, key) * weight,
    0,
  );
  const negative = Object.entries(PENALTIES).reduce(
    (sum, [key, weight]) => sum + unit(features[key] ?? 0, key) * weight,
    0,
  );
  return Math.max(0, Math.min(1, Number((positive - negative).toFixed(4))));
}

export function rankOpportunities(candidates, { minimumScore = 0.42, limit = 3 } = {}) {
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array');
  return candidates
    .map((candidate) => ({ ...candidate, opportunityScore: scoreOpportunity(candidate.features || {}) }))
    .filter((candidate) => candidate.opportunityScore >= minimumScore)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit);
}

export const OPPORTUNITY_WEIGHTS = WEIGHTS;
export const OPPORTUNITY_PENALTIES = PENALTIES;
