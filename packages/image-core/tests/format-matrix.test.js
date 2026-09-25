import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import sharp from 'sharp';
import { inspectImage, optimizeImage } from '../src/index.js';

function rawGradient(width = 320, height = 180, channels = 3) {
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      data[i] = x % 256;
      data[i + 1] = y % 256;
      data[i + 2] = (x + y) % 256;
      if (channels === 4) data[i + 3] = 160 + ((x + y) % 96);
    }
  }
  return { data, info: { width, height, channels } };
}

async function encode(format, options = {}) {
  const { data, info } = rawGradient(options.width ?? 320, options.height ?? 180, options.channels ?? 3);
  let pipeline = sharp(data, { raw: info });
  if (options.orientation) pipeline = pipeline.withMetadata({ orientation: options.orientation });
  if (format === 'jpeg') return pipeline.jpeg({ quality: 96 }).toBuffer();
  if (format === 'png') return pipeline.png().toBuffer();
  if (format === 'webp') return pipeline.webp({ quality: 92 }).toBuffer();
  if (format === 'avif') return pipeline.avif({ quality: 65, effort: 2 }).toBuffer();
  if (format === 'tiff') return pipeline.tiff().toBuffer();
  throw new Error(`unknown format ${format}`);
}

function expectFormatBlocked(error) {
  assert.equal(error?.code, 'INPUT_FORMAT_NOT_ALLOWED');
  assert.match(error?.message ?? '', /allowed input formats: JPEG, PNG, WebP/i);
  return true;
}

for (const format of ['jpeg', 'png', 'webp']) {
  test(`inspectImage reads ${format}`, async () => {
    const input = await encode(format);
    const meta = await inspectImage(input);
    assert.equal(meta.format, format);
    assert.equal(meta.width, 320);
    assert.equal(meta.height, 180);
    assert.ok(meta.bytes > 0);
  });
}

test('HEIF/AVIF input is rejected by the pre-decode format gate', async () => {
  const input = await encode('avif');
  await assert.rejects(() => inspectImage(input), expectFormatBlocked);
  await assert.rejects(
    () => optimizeImage(input, { policy: { format: 'webp' } }),
    expectFormatBlocked,
  );
});

test('non-allowlisted decoder input is rejected with the same stable code', async () => {
  const input = await encode('tiff');
  await assert.rejects(() => inspectImage(input), expectFormatBlocked);
});

test('unknown bytes fail closed before native decode', async () => {
  await assert.rejects(
    () => inspectImage(Buffer.from('not-an-image-but-untrusted-input')),
    expectFormatBlocked,
  );
});

test('transparent PNG converted to WebP keeps alpha', async () => {
  const input = await encode('png', { channels: 4, width: 128, height: 96 });
  const result = await optimizeImage(input, { policy: { format: 'webp', quality: 80 } });
  assert.equal(result.status, 'ACCEPT');
  assert.equal(result.output.hasAlpha, true);
});

test('autoOrient normalizes EXIF orientation while preserving safe dimensions', async () => {
  const input = await encode('jpeg', { width: 120, height: 80, orientation: 6 });
  const original = await inspectImage(input);
  assert.equal(original.orientation, 6);
  const result = await optimizeImage(input, { policy: { format: 'webp', quality: 80 } });
  assert.equal(result.status, 'ACCEPT');
  assert.ok(result.output.width <= 120);
  assert.ok(result.output.height <= 120);
  assert.ok(result.output.orientation === null || result.output.orientation === 1);
});

test('explicit AVIF output remains supported while AVIF input stays blocked', async () => {
  const input = await encode('jpeg', { width: 480, height: 320 });
  const result = await optimizeImage(input, {
    policy: { format: 'avif', avifQuality: 48, effort: 2, neverIncreaseBytes: false },
  });
  assert.equal(result.status, 'ACCEPT');
  assert.equal(result.output.format, 'avif');

  const decoder = `
    const sharp = require('sharp');
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', async () => {
      try {
        const metadata = await sharp(Buffer.concat(chunks)).metadata();
        process.stdout.write(JSON.stringify({
          format: metadata.format,
          compression: metadata.compression,
          width: metadata.width,
          height: metadata.height,
        }));
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    });
  `;
  const child = spawnSync(process.execPath, ['-e', decoder], {
    cwd: process.cwd(),
    input: result.buffer,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  assert.equal(child.status, 0, child.stderr);
  const metadata = JSON.parse(child.stdout);
  assert.equal(metadata.format, 'heif');
  assert.equal(metadata.compression, 'av1');
  assert.equal(metadata.width, 480);
  assert.equal(metadata.height, 320);

  await assert.rejects(() => inspectImage(result.buffer), expectFormatBlocked);
});
