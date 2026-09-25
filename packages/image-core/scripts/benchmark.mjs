import sharp from 'sharp';
import { optimizeImage } from '../src/index.js';

const width = 960;
const height = 640;
const channels = 3;
const raw = Buffer.alloc(width * height * channels);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * channels;
    raw[i] = (x * 3 + y) % 256;
    raw[i + 1] = (y * 5 + x) % 256;
    raw[i + 2] = (x * 7 + y * 11) % 256;
  }
}

const base = sharp(raw, { raw: { width, height, channels } });
const sources = {
  jpeg: await base.clone().jpeg({ quality: 96 }).toBuffer(),
  png: await base.clone().png().toBuffer(),
  webp: await base.clone().webp({ quality: 92 }).toBuffer(),
};

const rows = [];
for (const [sourceFormat, buffer] of Object.entries(sources)) {
  for (const targetFormat of ['webp', 'avif']) {
    const started = performance.now();
    const result = await optimizeImage(buffer, {
      target: { width: 640 },
      policy: { format: targetFormat, quality: 80, avifQuality: 48, effort: 2 },
    });
    rows.push({
      sourceFormat,
      targetFormat,
      sourceBytes: buffer.length,
      status: result.status,
      outputBytes: result.status === 'ACCEPT' ? result.output.bytes : buffer.length,
      savingsBytes: result.status === 'ACCEPT' ? result.savingsBytes : 0,
      savingsPercent: result.status === 'ACCEPT' ? result.savingsPercent : 0,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
    });
  }
}

const blockedInputs = [];
const blockedAvif = await base.clone().avif({ quality: 65, effort: 2 }).toBuffer();
try {
  await optimizeImage(blockedAvif, {
    target: { width: 640 },
    policy: { format: 'webp', quality: 80, effort: 2 },
  });
  throw new Error('security gate regression: AVIF input was unexpectedly accepted');
} catch (error) {
  if (error?.code !== 'INPUT_FORMAT_NOT_ALLOWED') throw error;
  blockedInputs.push({
    sourceFormat: 'avif',
    status: 'BLOCK',
    code: error.code,
  });
}

console.log(JSON.stringify({ fixture: { width, height }, rows, blockedInputs }, null, 2));
