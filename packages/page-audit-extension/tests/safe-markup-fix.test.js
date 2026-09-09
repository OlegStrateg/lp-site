import test from 'node:test';
import assert from 'node:assert/strict';
import { runAuditRules } from '../src/rules.js';
import { buildSafeMarkupFixPlan, applyMarkupPatchToImageFacts } from '../src/safe-markup-fix.js';

function image(overrides = {}) {
  return {
    id: 'img-0',
    src: 'https://example.test/hero.jpg',
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    renderedWidth: 600,
    renderedHeight: 400,
    widthAttr: null,
    heightAttr: null,
    srcset: 'hero-600.jpg 600w, hero-1200.jpg 1200w',
    loading: '',
    isLikelyHero: false,
    ...overrides,
  };
}

function finding() {
  return { ruleId: 'missing_image_dimensions', confidence: 'high' };
}

test('dimension patch preview fills missing width/height and resolves finding on re-audit', () => {
  const beforeImage = image();
  const before = runAuditRules({ seo: {}, images: [beforeImage] });
  assert.ok(before.some((item) => item.id.startsWith('missing_image_dimensions:')));

  const plan = buildSafeMarkupFixPlan({ finding: finding(), image: beforeImage });
  assert.equal(plan.status, 'PREVIEW_READY');
  assert.deepEqual(plan.patch.attributes, { width: '1200', height: '800' });
  assert.equal(plan.checks.productionWrite, false);

  const afterImage = applyMarkupPatchToImageFacts(beforeImage, plan);
  const after = runAuditRules({ seo: {}, images: [afterImage] });
  assert.equal(after.some((item) => item.id.startsWith('missing_image_dimensions:')), false);
  assert.equal(beforeImage.widthAttr, null);
  assert.equal(beforeImage.heightAttr, null);
});

test('existing width is preserved and missing height is derived from intrinsic ratio', () => {
  const plan = buildSafeMarkupFixPlan({ finding: finding(), image: image({ widthAttr: '600' }) });
  assert.equal(plan.status, 'PREVIEW_READY');
  assert.deepEqual(plan.patch.attributes, { width: '600', height: '400' });
});

test('aspect-ratio mismatch blocks automatic markup patch', () => {
  const plan = buildSafeMarkupFixPlan({
    finding: finding(),
    image: image({ renderedWidth: 600, renderedHeight: 600 }),
  });
  assert.equal(plan.status, 'REVIEW_REQUIRED');
  assert.match(plan.reason, /aspect ratio/i);
});

test('srcset, hero and unsupported rules remain outside markup auto-fix', () => {
  for (const ruleId of ['missing_srcset', 'hero_lazy', 'missing_title']) {
    const plan = buildSafeMarkupFixPlan({ finding: { ruleId, confidence: 'high' }, image: image() });
    assert.equal(plan.status, 'REVIEW_REQUIRED');
  }
});

test('low confidence and malformed existing dimensions are blocked', () => {
  assert.equal(buildSafeMarkupFixPlan({ finding: { ruleId: 'missing_image_dimensions', confidence: 'medium' }, image: image() }).status, 'REVIEW_REQUIRED');
  assert.equal(buildSafeMarkupFixPlan({ finding: finding(), image: image({ widthAttr: 'auto' }) }).status, 'REVIEW_REQUIRED');
});
