const SEVERITY_WEIGHT = Object.freeze({ critical: 100, high: 70, medium: 40, low: 20 });
const CONFIDENCE_MULTIPLIER = Object.freeze({ high: 1, medium: 0.8, low: 0.6 });

const RULE_META = Object.freeze({
  missing_title: { category: 'seo', confidence: 'high', scope: 'page' },
  missing_meta_description: { category: 'seo', confidence: 'high', scope: 'page' },
  missing_h1: { category: 'seo', confidence: 'high', scope: 'page' },
  multiple_h1: { category: 'seo', confidence: 'high', scope: 'page' },
  missing_canonical: { category: 'indexability', confidence: 'high', scope: 'page' },
  noindex: { category: 'indexability', confidence: 'high', scope: 'page' },
  oversized_image: { category: 'images', confidence: 'high', scope: 'element' },
  missing_image_dimensions: { category: 'images', confidence: 'high', scope: 'element' },
  missing_srcset: { category: 'images', confidence: 'high', scope: 'element' },
  hero_lazy: { category: 'performance', confidence: 'medium', scope: 'element' },
});

function baseRuleId(id = '') {
  return String(id).split(':', 1)[0];
}

function scaleBonus(count) {
  if (count >= 20) return 15;
  if (count >= 5) return 10;
  if (count >= 2) return 5;
  return 0;
}

export function priorityScore({ severity, confidence, affectedCount = 1 }) {
  const severityWeight = SEVERITY_WEIGHT[severity] ?? 0;
  const confidenceMultiplier = CONFIDENCE_MULTIPLIER[confidence] ?? 0.6;
  return Math.round(severityWeight * confidenceMultiplier + scaleBonus(affectedCount));
}

export function normalizeFindings(rawFindings = []) {
  const groups = new Map();

  for (const raw of rawFindings) {
    const ruleId = baseRuleId(raw.id);
    const meta = RULE_META[ruleId] ?? { category: 'other', confidence: 'medium', scope: 'page' };
    const groupKey = meta.scope === 'element' ? ruleId : raw.id;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        ruleId,
        category: meta.category,
        scope: meta.scope,
        severity: raw.severity,
        confidence: meta.confidence,
        title: raw.title,
        impact: raw.impact,
        fixability: raw.fixability ?? 'review',
        verification: raw.verification,
        affectedCount: 0,
        evidence: [],
      });
    }

    const group = groups.get(groupKey);
    group.affectedCount += 1;
    if (group.evidence.length < 5) {
      group.evidence.push({ id: raw.id, fact: raw.fact });
    }
  }

  return [...groups.values()]
    .map((item) => ({
      ...item,
      fact: item.affectedCount === 1
        ? item.evidence[0]?.fact ?? ''
        : `${item.affectedCount} affected elements. Showing ${item.evidence.length} evidence sample${item.evidence.length === 1 ? '' : 's'}.`,
      priorityScore: priorityScore(item),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.ruleId.localeCompare(b.ruleId));
}

export const FINDING_MODEL = Object.freeze({
  severity: ['critical', 'high', 'medium', 'low'],
  confidence: ['high', 'medium', 'low'],
  fixability: ['safe-candidate', 'review'],
  categories: ['indexability', 'seo', 'images', 'performance', 'other'],
});
