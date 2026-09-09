import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { inspectImage, optimizeImage } from '../src/index.js';

async function makeJpeg(width = 320, height = 180) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 180, g: 90, b: 40 },
    },
  }).jpeg({ quality: 96 }).toBuffer();
}

async function makeTransparentPng(width = 64, height = 64) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 40, g: 80, b: 120, alpha: 0.4 },
    },
  }).png().toBuffer();
}

test('inspectImage returns deterministic metadata', async () => {
  const input = await makeJpeg(320, 180);
  const meta = await inspectImage(input);
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, 320);
  assert.equal(meta.height, 180);
  assert.equal(meta.bytes, input.length);
});

test('no-upscale guard prevents dimensions above original', async () => {
  const input = await makeJpeg(120, 80);
  const result = await optimizeImage(input, {
    target: { width: 1200, height: 800 },
    policy: { format: 'webp', quality: 80 },
  });
  assert.ok(result.output.width <= 120);
  assert.ok(result.output.height <= 80);
});

test('preserveAlpha rejects forced JPEG conversion', async () => {
  const input = await makeTransparentPng();
  const result = await optimizeImage(input, {
    policy: { format: 'jpeg', preserveAlpha: true },
  });
  assert.equal(result.status, 'REJECT');
  assert.equal(result.reason, 'alpha_would_be_lost');
  assert.deepEqual(result.buffer, input);
});

test('never-increase-bytes returns original when candidate is not smaller', async () => {
  const input = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 3,
      background: { r: 10, g: 10, b: 10 },
    },
  }).webp({ quality: 20 }).toBuffer();

  const result = await optimizeImage(input, {
    policy: { format: 'png', neverIncreaseBytes: true },
  });

  assert.equal(result.status, 'REJECT');
  assert.equal(result.reason, 'no_byte_saving');
  assert.deepEqual(result.buffer, input);
});

test('invalid format is rejected before processing', async () => {
  const input = await makeJpeg();
  await assert.rejects(
    () => optimizeImage(input, { policy: { format: 'gif' } }),
    /Unsupported output format/,
  );
});
