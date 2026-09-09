import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { buildSafeImageFixPlan, prepareSafeImageFix } from '../src/safe-fix.js';

async function fixture({ alpha = false } = {}) {
  const image = sharp({
    create: {
      width: 1200,
      height: 800,
      channels: alpha ? 4 : 3,
      background: alpha ? { r: 180, g: 80, b: 40, alpha: 0.6 } : { r: 180, g: 80, b: 40 },
    },
  });
  return alpha ? image.png().toBuffer() : image.jpeg({ quality: 95 }).toBuffer();
}

test('buildSafeImageFixPlan allows only high-confidence image rules with complete dimensions', () => {
  const ready = buildSafeImageFixPlan({
    finding: { ruleId: 'oversized_image', confidence: 'high' },
    image: { renderedWidth: 600, renderedHeight: 400, intrinsicWidth: 1200, intrinsicHeight: 800 },
  });
  assert.equal(ready.status, 'READY');
  assert.deepEqual(ready.target, { width: 600, height: 400 });

  const blocked = buildSafeImageFixPlan({
    finding: { ruleId: 'hero_lazy', confidence: 'medium' },
    image: { renderedWidth: 600, renderedHeight: 400, intrinsicWidth: 1200, intrinsicHeight: 800 },
  });
  assert.equal(blocked.status, 'REVIEW_REQUIRED');
});

test('prepareSafeImageFix creates a separate smaller preview and leaves original bytes unchanged', async () => {
  const source = await fixture();
  const originalCopy = Buffer.from(source);
  const plan = buildSafeImageFixPlan({
    finding: { ruleId: 'oversized_image', confidence: 'high' },
    image: { renderedWidth: 600, renderedHeight: 400, intrinsicWidth: 1200, intrinsicHeight: 800 },
  });
  const result = await prepareSafeImageFix({ buffer: source, plan });
  assert.equal(result.status, 'PREVIEW_READY');
  assert.ok(Buffer.isBuffer(result.candidateBuffer));
  assert.ok(result.after.bytes < result.before.bytes);
  assert.ok(result.after.width <= result.before.width);
  assert.ok(result.after.height <= result.before.height);
  assert.equal(result.checks.originalUnchanged, true);
  assert.deepEqual(source, originalCopy);
});

test('prepareSafeImageFix preserves alpha for transparent input', async () => {
  const source = await fixture({ alpha: true });
  const plan = buildSafeImageFixPlan({
    finding: { ruleId: 'oversized_image', confidence: 'high' },
    image: { renderedWidth: 600, renderedHeight: 400, intrinsicWidth: 1200, intrinsicHeight: 800 },
  });
  const result = await prepareSafeImageFix({ buffer: source, plan });
  assert.equal(result.status, 'PREVIEW_READY');
  assert.equal(result.before.hasAlpha, true);
  assert.equal(result.after.hasAlpha, true);
  assert.equal(result.checks.alphaPreserved, true);
});
