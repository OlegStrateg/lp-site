import sharp from 'sharp';
import { chooseOutputFormat, validatePolicy } from './policy.js';

const ALLOWED_UNTRUSTED_BUFFER_LOADERS = Object.freeze([
  'VipsForeignLoadJpegBuffer',
  'VipsForeignLoadPngBuffer',
  'VipsForeignLoadWebpBuffer',
]);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Native decoder boundary: fail closed for all foreign input, then reopen only
// Buffer loaders that are part of LayerPorter's supported input contract.
// HEIF/AVIF decoding stays disabled until the bundled runtime is independently
// verified with libheif >=1.23.4, the current advisory set is re-reviewed, and
// input support is explicitly re-approved.
sharp.block({ operation: ['VipsForeignLoad'] });
sharp.unblock({ operation: ALLOWED_UNTRUSTED_BUFFER_LOADERS });

function assertBuffer(input) {
  if (!Buffer.isBuffer(input) || input.length === 0) {
    throw new TypeError('input must be a non-empty Buffer');
  }
}

function detectAllowedInputFormat(input) {
  if (input.length >= 2 && input[0] === 0xff && input[1] === 0xd8) return 'jpeg';
  if (input.length >= PNG_SIGNATURE.length && input.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return 'png';
  if (
    input.length >= 12
    && input.toString('ascii', 0, 4) === 'RIFF'
    && input.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  return null;
}

function assertAllowedInputFormat(input) {
  const format = detectAllowedInputFormat(input);
  if (format) return format;

  const error = new TypeError('Unsupported or security-blocked input format; allowed input formats: JPEG, PNG, WebP');
  error.code = 'INPUT_FORMAT_NOT_ALLOWED';
  throw error;
}

function assertTarget(target = {}) {
  for (const key of ['width', 'height']) {
    if (target[key] !== undefined && (!Number.isInteger(target[key]) || target[key] < 1)) {
      throw new TypeError(`${key} must be a positive integer`);
    }
  }
}

function normalizeFormat(format, compression) {
  if (format === 'heif' && compression === 'av1') return 'avif';
  return format ?? null;
}

function orientedBounds(image, applyOrientation) {
  if (applyOrientation && [5, 6, 7, 8].includes(image.orientation)) {
    return { width: image.height, height: image.width };
  }
  return { width: image.width, height: image.height };
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

async function inspectEncodedOutput(data, info, outputFormat, policy) {
  // HEIF/AVIF input is intentionally blocked in this process. For an AVIF we
  // just encoded from an already validated input, use Sharp's encode result
  // metadata instead of reopening the HEIF decoder. Independent fresh-process
  // decode remains part of the regression/release gate.
  if (outputFormat === 'avif') {
    return {
      format: 'avif',
      hasAlpha: info.channels === 4,
      orientation: null,
      space: info.space ?? null,
    };
  }

  const metadata = await sharp(data, { limitInputPixels: policy.maxPixels }).metadata();
  return {
    format: normalizeFormat(metadata.format, metadata.compression),
    hasAlpha: Boolean(metadata.hasAlpha),
    orientation: metadata.orientation ?? null,
    space: metadata.space ?? null,
  };
}

export async function inspectImage(input, options = {}) {
  assertBuffer(input);
  assertAllowedInputFormat(input);
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
    format: normalizeFormat(metadata.format, metadata.compression),
    mediaType: metadata.mediaType ?? null,
    compression: metadata.compression ?? null,
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
  const originalBounds = orientedBounds(original, policy.preserveOrientation);

  if (policy.withoutEnlargement && (info.width > originalBounds.width || info.height > originalBounds.height)) {
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
        format: outputFormat,
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

  const outputMetadata = await inspectEncodedOutput(data, info, outputFormat, policy);
  if (policy.preserveAlpha && original.hasAlpha && !outputMetadata.hasAlpha) {
    throw new Error('alpha preservation guard failed');
  }

  return {
    status: 'ACCEPT',
    reason: 'smaller_without_guard_regression',
    original,
    output: {
      bytes: data.length,
      format: outputMetadata.format,
      width: info.width,
      height: info.height,
      hasAlpha: outputMetadata.hasAlpha,
      orientation: outputMetadata.orientation,
      space: outputMetadata.space,
    },
    outputFormat,
    savingsBytes,
    savingsPercent,
    buffer: data,
  };
}

export { DEFAULT_POLICY, validatePolicy, chooseOutputFormat } from './policy.js';
export { analyzeImageUsage, analyzePageImages } from './page-analysis.js';
