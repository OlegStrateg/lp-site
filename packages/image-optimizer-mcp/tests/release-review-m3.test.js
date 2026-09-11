import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { loadUrlImages } from '../src/url-ingestion.js';

function pageResponse(html) {
  return {
    status: 200,
    url: 'https://example.test/',
    headers: { 'content-type': 'text/html' },
    body: Buffer.from(html),
    redirects: [],
  };
}

function imageResponse(url, body) {
  return { status: 200, url, headers: { 'content-type': 'image/png' }, body, redirects: [] };
}

test('accepted image bytes never exceed maxTotalImageBytes under parallel workers', async () => {
  const image = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 120, g: 80, b: 40 } } }).png().toBuffer();
  const budget = image.length + Math.max(1, Math.floor(image.length / 2));
  const html = '<html><body><img src="https://example.test/a.png"><img src="https://example.test/b.png"></body></html>';
  const fetchImpl = async (url) => {
    if (url === 'https://example.test/') return pageResponse(html);
    return imageResponse(url, image);
  };

  const result = await loadUrlImages({ url: 'https://example.test/', maxImages: 2 }, {
    fetchImpl,
    limits: { maxTotalImageBytes: budget, concurrency: 2, maxImageBytes: image.length + 16 },
  });

  assert.ok(result.fetchedImageBytes <= budget, `accepted ${result.fetchedImageBytes} bytes > budget ${budget}`);
  assert.equal(result.fetched, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.images.filter((item) => item.reason === 'total_image_byte_budget').length, 1);
});

test('an invalid parallel image does not consume accepted byte budget needed by a valid image', async () => {
  const valid = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 20, g: 160, b: 90 } } }).png().toBuffer();
  const invalid = Buffer.alloc(valid.length, 0x5a);
  const html = '<html><body><img src="https://example.test/invalid.png"><img src="https://example.test/valid.png"></body></html>';
  const fetchImpl = async (url) => {
    if (url === 'https://example.test/') return pageResponse(html);
    if (url.endsWith('/invalid.png')) return imageResponse(url, invalid);
    return imageResponse(url, valid);
  };

  const result = await loadUrlImages({ url: 'https://example.test/', maxImages: 2 }, {
    fetchImpl,
    limits: { maxTotalImageBytes: valid.length, concurrency: 2, maxImageBytes: valid.length + 16 },
  });

  assert.equal(result.fetchedImageBytes, valid.length);
  assert.equal(result.fetched, 1);
  assert.equal(result.skipped, 1);
  const validResult = result.images.find((item) => item.sourceUrl.endsWith('/valid.png'));
  const invalidResult = result.images.find((item) => item.sourceUrl.endsWith('/invalid.png'));
  assert.equal(validResult.status, 'FETCHED');
  assert.equal(invalidResult.status, 'SKIP');
  assert.notEqual(invalidResult.reason, 'total_image_byte_budget');
});
