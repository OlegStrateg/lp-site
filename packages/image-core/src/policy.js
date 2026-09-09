export const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif']);

export const DEFAULT_POLICY = Object.freeze({
  format: 'auto',
  quality: 82,
  avifQuality: 50,
  effort: 4,
  withoutEnlargement: true,
  preserveAlpha: true,
  preserveOrientation: true,
  neverIncreaseBytes: true,
  maxWidth: 8192,
  maxHeight: 8192,
  maxPixels: 40_000_000,
});

export function validatePolicy(policy = {}) {
  const merged = { ...DEFAULT_POLICY, ...policy };

  if (!['auto', ...ALLOWED_FORMATS].includes(merged.format)) {
    throw new TypeError(`Unsupported output format: ${merged.format}`);
  }

  if (!Number.isInteger(merged.quality) || merged.quality < 1 || merged.quality > 100) {
    throw new TypeError('quality must be an integer between 1 and 100');
  }

  if (!Number.isInteger(merged.avifQuality) || merged.avifQuality < 1 || merged.avifQuality > 100) {
    throw new TypeError('avifQuality must be an integer between 1 and 100');
  }

  if (!Number.isInteger(merged.effort) || merged.effort < 0 || merged.effort > 9) {
    throw new TypeError('effort must be an integer between 0 and 9');
  }

  return merged;
}

export function chooseOutputFormat(metadata, policy) {
  if (policy.format !== 'auto') return policy.format;

  if (metadata.hasAlpha) {
    return metadata.format === 'png' ? 'webp' : metadata.format || 'webp';
  }

  if (metadata.format === 'jpeg' || metadata.format === 'png') return 'webp';
  if (metadata.format === 'webp' || metadata.format === 'avif') return metadata.format;
  return 'webp';
}
