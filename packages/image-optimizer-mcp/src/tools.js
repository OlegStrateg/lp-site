import { analyzePageImages, inspectImage, optimizeImage } from './image-core/index.js';

function requireBuffer(value, name) {
  if (!Buffer.isBuffer(value) || value.length === 0) throw new TypeError(`${name} must be a non-empty Buffer`);
}

export async function analyzePageImagesTool(input) {
  return analyzePageImages(input);
}

export async function optimizeImageTool(input) {
  requireBuffer(input.buffer, 'buffer');
  return optimizeImage(input.buffer, { target: input.target, policy: input.policy });
}

export async function generateResponsiveVariantsTool(input) {
  requireBuffer(input.buffer, 'buffer');
  const original = await inspectImage(input.buffer, { policy: input.policy });
  const widths = [...new Set((input.widths ?? []).filter((w) => Number.isInteger(w) && w > 0 && w <= original.width))]
    .sort((a, b) => a - b)
    .slice(0, Math.max(1, Math.min(input.maxVariants ?? 4, 6)));
  const variants = [];
  for (const width of widths) {
    const result = await optimizeImage(input.buffer, { target: { width }, policy: input.policy });
    variants.push({ width, ...result });
  }
  return { status: variants.some((v) => v.status === 'ACCEPT') ? 'ACCEPT' : 'REJECT', original, variants };
}

export async function compareImageVersionsTool(input) {
  requireBuffer(input.original, 'original');
  requireBuffer(input.candidate, 'candidate');
  const original = await inspectImage(input.original, { policy: input.policy });
  const candidate = await inspectImage(input.candidate, { policy: input.policy });
  const savingsBytes = original.bytes - candidate.bytes;
  const alphaRegression = original.hasAlpha && !candidate.hasAlpha;
  const dimensionRegression = candidate.width > original.width || candidate.height > original.height;
  return {
    status: savingsBytes > 0 && !alphaRegression && !dimensionRegression ? 'ACCEPT' : 'REJECT',
    original,
    candidate,
    savingsBytes,
    savingsPercent: Number(((savingsBytes / original.bytes) * 100).toFixed(2)),
    checks: { alphaRegression, dimensionRegression },
  };
}

export async function optimizePageImagesTool(input) {
  if (!Array.isArray(input.items)) throw new TypeError('items must be an array');
  const items = input.items.slice(0, Math.max(1, Math.min(input.maxItems ?? 10, 20)));
  const results = [];
  for (const item of items) {
    requireBuffer(item.buffer, 'item.buffer');
    results.push({ id: item.id ?? null, ...(await optimizeImage(item.buffer, { target: item.target, policy: item.policy ?? input.policy })) });
  }
  return {
    status: results.some((r) => r.status === 'ACCEPT') ? 'ACCEPT' : 'REJECT',
    processed: results.length,
    accepted: results.filter((r) => r.status === 'ACCEPT').length,
    results,
  };
}

export const TOOL_HANDLERS = {
  analyze_page_images: analyzePageImagesTool,
  optimize_image: optimizeImageTool,
  generate_responsive_variants: generateResponsiveVariantsTool,
  compare_image_versions: compareImageVersionsTool,
  optimize_page_images: optimizePageImagesTool,
};
