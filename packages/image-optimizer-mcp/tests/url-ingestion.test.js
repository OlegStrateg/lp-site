import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { optimizeImageTool } from '../src/tools.js';
import { analyzeRemotePageImages, extractImageRefs, optimizeRemotePageImages } from '../src/url-ingestion.js';

async function gradientJpeg(width = 640, height = 480) {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      data[i] = x % 256;
      data[i + 1] = y % 256;
      data[i + 2] = (x + y) % 256;
    }
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).jpeg({ quality: 100 }).toBuffer();
}

async function gradientAvif(width = 320, height = 240) {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      data[i] = x % 256;
      data[i + 1] = y % 256;
      data[i + 2] = (x + y) % 256;
    }
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).avif({ quality: 60, effort: 2 }).toBuffer();
}

function expectFormatBlocked(error) {
  assert.equal(error?.code, 'INPUT_FORMAT_NOT_ALLOWED');
  return true;
}

test('HTML image extraction is bounded, resolves relative URLs and keeps static hints separate', () => {
  const html = '<img src="/a.jpg" srcset="/a-320.jpg 320w, /a-640.jpg 640w" sizes="50vw" width="640" height="480"><img src="https://cdn.example.com/b.webp">';
  const result = extractImageRefs(html, 'https://example.com/path/', 1);
  assert.equal(result.imgTagCount, 2);
  assert.equal(result.refs.length, 1);
  assert.equal(result.refs[0].url, 'https://example.com/a.jpg');
  assert.equal(result.refs[0].widthAttr, 640);
  assert.equal(result.refs[0].heightAttr, 480);
  assert.match(result.refs[0].srcset, /320w/);
});

test('URL analyze mode exposes fetched image facts but no binary or browser-only claims', async () => {
  const image = await gradientJpeg();
  const fakeFetch = async (url) => {
    const href = url instanceof URL ? url.href : String(url);
    if (href === 'https://example.com/') return {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: Buffer.from('<html><img src="/hero.jpg" width="640" height="480"></html>'),
      url: href,
      redirects: [],
    };
    return {
      status: 200,
      headers: { 'content-type': 'image/jpeg' },
      body: image,
      url: href,
      redirects: [],
    };
  };

  const result = await analyzeRemotePageImages({ url: 'https://example.com/', maxImages: 2 }, { fetchImpl: fakeFetch });
  assert.equal(result.status, 'OK');
  assert.equal(result.mode, 'http_fast');
  assert.equal(result.browserMetrics, false);
  assert.equal(result.fetched, 1);
  assert.equal(result.images[0].image.width, 640);
  assert.equal(JSON.stringify(result).includes('"buffer"'), false);
  assert.match(result.safetyNote, /does not claim rendered size/i);
});

test('URL optimize mode only recompresses same dimensions and keeps real binary candidate for artifact delivery', async () => {
  const image = await gradientJpeg();
  const fakeFetch = async (url) => {
    const href = url instanceof URL ? url.href : String(url);
    if (href === 'https://example.com/') return {
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: Buffer.from('<img src="/hero.jpg" width="320" height="240">'),
      url: href,
      redirects: [],
    };
    return {
      status: 200,
      headers: { 'content-type': 'image/jpeg' },
      body: image,
      url: href,
      redirects: [],
    };
  };

  const result = await optimizeRemotePageImages({ url: 'https://example.com/', maxImages: 1 }, { fetchImpl: fakeFetch });
  assert.equal(result.mode, 'http_fast_same_dimensions');
  assert.equal(result.processed, 1);
  assert.equal(result.accepted, 1);
  const optimization = result.results[0].optimization;
  assert.equal(optimization.status, 'ACCEPT');
  assert.equal(Buffer.isBuffer(optimization.buffer), true);
  assert.equal(optimization.output.width, 640);
  assert.equal(optimization.output.height, 480);
  assert.ok(optimization.buffer.length < image.length);
});

test('MCP direct image tool fails closed with stable code for HEIF/AVIF input', async () => {
  const image = await gradientAvif();
  await assert.rejects(
    () => optimizeImageTool({ buffer: image, policy: { format: 'webp' } }),
    expectFormatBlocked,
  );
});

test('URL AVIF bytes are blocked even when remote Content-Type is spoofed as JPEG', async () => {
  const image = await gradientAvif();
  const fakeFetch = async (url) => {
    const href = url instanceof URL ? url.href : String(url);
    if (href === 'https://example.com/') return {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: Buffer.from('<html><img src="/hero.jpg" width="320" height="240"></html>'),
      url: href,
      redirects: [],
    };
    return {
      status: 200,
      // Deliberately spoofed: security decision must come from bytes + decoder allowlist.
      headers: { 'content-type': 'image/jpeg' },
      body: image,
      url: href,
      redirects: [],
    };
  };

  const analyzed = await analyzeRemotePageImages({ url: 'https://example.com/', maxImages: 1 }, { fetchImpl: fakeFetch });
  assert.equal(analyzed.status, 'NO_IMAGES');
  assert.equal(analyzed.fetched, 0);
  assert.equal(analyzed.skipped, 1);
  assert.equal(analyzed.images[0].status, 'SKIP');
  assert.equal(analyzed.images[0].reason, 'INPUT_FORMAT_NOT_ALLOWED');

  const optimized = await optimizeRemotePageImages({ url: 'https://example.com/', maxImages: 1 }, { fetchImpl: fakeFetch });
  assert.equal(optimized.status, 'REJECT');
  assert.equal(optimized.processed, 0);
  assert.equal(optimized.accepted, 0);
  assert.equal(optimized.results[0].status, 'SKIP');
  assert.equal(optimized.results[0].reason, 'INPUT_FORMAT_NOT_ALLOWED');
});
