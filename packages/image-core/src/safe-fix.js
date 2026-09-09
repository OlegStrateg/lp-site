import { inspectImage, optimizeImage } from './index.js';

const SAFE_IMAGE_RULES = new Set(['oversized_image', 'missing_image_dimensions', 'missing_srcset']);
const BYTE_TRANSFORM_RULES = new Set(['oversized_image']);

function cloneBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new TypeError('buffer must be a non-empty Buffer');
  return Buffer.from(buffer);
}

export function buildSafeImageFixPlan({ finding, image }) {
  if (!finding || !SAFE_IMAGE_RULES.has(finding.ruleId)) {
    return { status: 'REVIEW_REQUIRED', reason: 'finding is outside the safe image allowlist' };
  }
  if (!BYTE_TRANSFORM_RULES.has(finding.ruleId)) {
    return {
      status: 'REVIEW_REQUIRED',
      reason: 'this finding requires a markup patch; byte optimization alone cannot resolve it',
    };
  }
  if (finding.confidence !== 'high') {
    return { status: 'REVIEW_REQUIRED', reason: 'high confidence is required for safe image fix' };
  }
  const renderedWidth = Number(image?.renderedWidth || 0);
  const renderedHeight = Number(image?.renderedHeight || 0);
  const intrinsicWidth = Number(image?.intrinsicWidth || 0);
  const intrinsicHeight = Number(image?.intrinsicHeight || 0);
  if (!renderedWidth || !renderedHeight || !intrinsicWidth || !intrinsicHeight) {
    return { status: 'REVIEW_REQUIRED', reason: 'complete rendered and intrinsic dimensions are required' };
  }
  if (intrinsicWidth <= renderedWidth * 2 && intrinsicHeight <= renderedHeight * 2) {
    return { status: 'REVIEW_REQUIRED', reason: 'oversize threshold is not independently confirmed' };
  }
  return {
    status: 'READY',
    ruleId: finding.ruleId,
    target: {
      width: Math.min(intrinsicWidth, Math.ceil(renderedWidth)),
      height: Math.min(intrinsicHeight, Math.ceil(renderedHeight)),
    },
    policy: {
      withoutEnlargement: true,
      preserveAlpha: true,
      neverIncreaseBytes: true,
    },
  };
}

export async function prepareSafeImageFix({ buffer, plan, policy = {} }) {
  if (!plan || plan.status !== 'READY') throw new TypeError('READY safe image fix plan required');
  const originalBuffer = cloneBuffer(buffer);
  const before = await inspectImage(originalBuffer, { policy: { ...plan.policy, ...policy } });
  const optimized = await optimizeImage(originalBuffer, {
    target: plan.target,
    policy: { ...plan.policy, ...policy },
  });

  if (optimized.status !== 'ACCEPT' || !Buffer.isBuffer(optimized.buffer)) {
    return {
      status: 'REJECT',
      reason: optimized.reason || 'candidate failed optimization guards',
      before,
      after: optimized.output || null,
      savingsBytes: optimized.savingsBytes ?? 0,
      candidateBuffer: null,
    };
  }

  const candidateBuffer = Buffer.from(optimized.buffer);
  const after = await inspectImage(candidateBuffer, { policy: { ...plan.policy, ...policy } });
  const savingsBytes = before.bytes - after.bytes;
  const noUpscale = after.width <= before.width && after.height <= before.height;
  const alphaPreserved = !before.hasAlpha || after.hasAlpha;
  const smaller = savingsBytes > 0;
  const targetSatisfied = after.width <= plan.target.width && after.height <= plan.target.height;
  const originalUnchanged = buffer.equals(originalBuffer);
  const guardsPass = noUpscale && alphaPreserved && smaller && targetSatisfied && originalUnchanged;

  return {
    status: guardsPass ? 'PREVIEW_READY' : 'REJECT',
    before,
    after,
    savingsBytes,
    savingsPercent: Number(((savingsBytes / before.bytes) * 100).toFixed(2)),
    checks: { noUpscale, alphaPreserved, smaller, targetSatisfied, originalUnchanged },
    candidateBuffer: guardsPass ? candidateBuffer : null,
  };
}

export const SAFE_IMAGE_FIX_RULES = Object.freeze([...SAFE_IMAGE_RULES]);
export const BYTE_TRANSFORM_SAFE_IMAGE_RULES = Object.freeze([...BYTE_TRANSFORM_RULES]);
