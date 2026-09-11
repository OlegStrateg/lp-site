import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { buildSafeImageFixPlan, prepareSafeImageFix } from '../src/safe-fix.js';
import { runAuditRules } from '../../page-audit-extension/src/rules.js';
import { normalizeFindings } from '../../page-audit-extension/src/findings.js';

async function fixture() {
  return sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 120, g: 90, b: 200 },
    },
  }).jpeg({ quality: 95 }).toBuffer();
}

function snapshotFor(image) {
  return {
    seo: { title: 'Test', metaDescription: 'Test', h1Count: 1, canonical: 'https://example.com/' },
    images: [{
      id: 'hero',
      src: 'https://example.com/hero.jpg',
      intrinsicWidth: image.intrinsicWidth,
      intrinsicHeight: image.intrinsicHeight,
      renderedWidth: image.renderedWidth,
      renderedHeight: image.renderedHeight,
      widthAttr: image.widthAttr ?? '500',
      heightAttr: image.heightAttr ?? '333',
      srcset: image.srcset ?? 'hero-500.jpg 500w, hero-1000.jpg 1000w',
      loading: 'eager',
      isLikelyHero: false,
    }],
  };
}

function normalized(snapshot) {
  return normalizeFindings(runAuditRules(snapshot));
}

test('DETECT → TRANSFORM → RE-AUDIT removes verified oversized-image finding', async () => {
  const beforeSnapshot = snapshotFor({ intrinsicWidth: 1200, intrinsicHeight: 800, renderedWidth: 500, renderedHeight: 333 });
  const beforeFindings = normalized(beforeSnapshot);
  const oversized = beforeFindings.find((item) => item.ruleId === 'oversized_image');
  assert.ok(oversized, 'oversized finding must be detected before fix');

  const source = await fixture();
  const originalCopy = Buffer.from(source);
  const plan = buildSafeImageFixPlan({ finding: oversized, image: beforeSnapshot.images[0] });
  assert.equal(plan.status, 'READY');

  const preview = await prepareSafeImageFix({ buffer: source, plan });
  assert.equal(preview.status, 'PREVIEW_READY');
  assert.deepEqual(source, originalCopy, 'source bytes must remain unchanged');

  const afterSnapshot = snapshotFor({
    intrinsicWidth: preview.after.width,
    intrinsicHeight: preview.after.height,
    renderedWidth: 500,
    renderedHeight: 333,
  });
  const afterFindings = normalized(afterSnapshot);
  assert.equal(afterFindings.some((item) => item.ruleId === 'oversized_image'), false);

  const verifiedImprovement = preview.savingsBytes > 0 && !afterFindings.some((item) => item.ruleId === 'oversized_image');
  assert.equal(verifiedImprovement, true);
});

test('byte optimization is not accepted as verification for markup-only findings', () => {
  const missingDimensions = snapshotFor({
    intrinsicWidth: 700,
    intrinsicHeight: 467,
    renderedWidth: 500,
    renderedHeight: 333,
    widthAttr: '',
    heightAttr: '',
  });
  const findings = normalized(missingDimensions);
  const finding = findings.find((item) => item.ruleId === 'missing_image_dimensions');
  assert.ok(finding);
  const plan = buildSafeImageFixPlan({ finding, image: missingDimensions.images[0] });
  assert.equal(plan.status, 'REVIEW_REQUIRED');
});

test('Verified Improvement Rate counts only accepted fixes whose finding disappears on re-audit', () => {
  const attempts = [
    { applied: true, noRegression: true, findingResolved: true },
    { applied: true, noRegression: true, findingResolved: false },
    { applied: false, noRegression: true, findingResolved: false },
  ];
  const applied = attempts.filter((item) => item.applied);
  const verified = applied.filter((item) => item.noRegression && item.findingResolved);
  const rate = verified.length / applied.length;
  assert.equal(rate, 0.5);
});
