import sharp from 'sharp';
import { chooseOutputFormat, validatePolicy } from './policy.js';

function assertBuffer(input) {
  if (!Buffer.isBuffer(input) || input.length === 0) {
    throw new TypeError('input must be a non-empty Buffer');
  }
}

function assertTarget(target = {}) {
  for (const key of ['width', 'height']) {
    if (target[key] !== undefined && (!Number.isInteger(target[key]) || target[key] < 1)) {
      throw new TypeError(`${key} must be a positive integer`);
    }
  }
}

function encoder(pipeline, format, policy) {
  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({ quality: policy.quality, mozjpeg: true });
    case 'png':
      return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    case 'webp':
      return pipeline.webp({ quality: policy.quality, effort: Math.min(policy.effort, 6) });
    case 'avif':
      return pipeline.avif({ quality: policy.avifQuality, effort: policy.effort });
    default:
      throw new TypeError(`Unsupported encoder: ${format}`);
  }
}

export async function inspectImage(input, options = {}) {
  assertBuffer(input);
  const policy = validatePolicy(options.policy);
  const metadata = await sharp(input, { limitInputPixels: policy.maxPixels }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to determine image dimensions');
  }
  if (metadata.width > policy.maxWidth || metadata.height > policy.maxHeight) {
    throw new RangeError(`Image dimensions exceed ${policy.maxWidth}x${policy.maxHeight}`);
  }

  return {
    bytes: input.length,
    format: metadata.format ?? null,
    mediaType: metadata.mediaType ?? null,
    width: metadata.width,
    height: metadata.height,
    orientation: metadata.orientation ?? null,
    hasAlpha: Boolean(metadata.hasAlpha),
    space: metadata.space ?? null,
    channels: metadata.channels ?? null,
  };
}

export async function optimizeImage(input, options = {}) {
  assertBuffer(input);
  const target = options.target ?? {};
  assertTarget(target);
  const policy = validatePolicy(options.policy);
  const original = await inspectImage(input, { policy });
  const outputFormat = chooseOutputFormat(original, policy);

  if (policy.preserveAlpha && original.hasAlpha && outputFormat === 'jpeg') {
    return {
      status: 'REJECT',
      reason: 'alpha_would_be_lost',
      original,
      output: original,
      outputFormat: original.format,
      savingsBytes: 0,
      savingsPercent: 0,
      buffer: input,
    };
  }

  let pipeline = sharp(input, { limitInputPixels: policy.maxPixels });

  if (policy.preserveOrientation) {
    pipeline = pipeline.autoOrient();
  }

  pipeline = pipeline.keepIccProfile();

  if (target.width || target.height) {
    pipeline = pipeline.resize({
      width: target.width,
      height: target.height,
      fit: 'inside',
      withoutEnlargement: policy.withoutEnlargement,
    });
  }

  const encoded = encoder(pipeline, outputFormat, policy);
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });

  if (policy.withoutEnlargement && (info.width > original.width || info.height > original.height)) {
    throw new Error('no-upscale guard failed');
  }
  if (policy.preserveAlpha && original.hasAlpha && !info.channels) {
    throw new Error('alpha verification unavailable');
  }

  const savingsBytes = original.bytes - data.length;
  const savingsPercent = Number(((savingsBytes / original.bytes) * 100).toFixed(2));

  if (policy.neverIncreaseBytes && data.length >= original.bytes) {
    return {
      status: 'REJECT',
      reason: 'no_byte_saving',
      original,
      output: {
        bytes: data.length,
        format: info.format,
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
      outputFormat,
      savingsBytes,
      savingsPercent,
      buffer: input,
    };
  }

  const outputMetadata = await sharp(data, { limitInputPixels: policy.maxPixels }).metadata();
  if (policy.preserveAlpha && original.hasAlpha && !outputMetadata.hasAlpha) {
    throw new Error('alpha preservation guard failed');
  }

  return {
    status: 'ACCEPT',
    reason: 'smaller_without_guard_regression',
    original,
    output: {
      bytes: data.length,
      format: info.format,
      width: info.width,
      height: info.height,
      hasAlpha: Boolean(outputMetadata.hasAlpha),
      orientation: outputMetadata.orientation ?? null,
      space: outputMetadata.space ?? null,
    },
    outputFormat,
    savingsBytes,
    savingsPercent,
    buffer: data,
  };
}

export { DEFAULT_POLICY, validatePolicy, chooseOutputFormat } from './policy.js';
