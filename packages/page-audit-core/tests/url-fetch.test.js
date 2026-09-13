import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeAuditUrl, fetchPublicHtml, isBlockedIp } from '../src/url-fetch.js';

test('URL safety blocks local, private, credentialed and non-web targets', () => {
  for (const value of [
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://localhost/',
    'http://example.local/',
    'ftp://example.com/',
    'https://user:pass@example.com/',
    'https://example.com:8443/',
  ]) {
    assert.throws(() => assertSafeAuditUrl(value));
  }
  assert.equal(assertSafeAuditUrl('https://example.com/path#x').toString(), 'https://example.com/path');
});

test('IP classifier blocks common private/link-local/reserved ranges', () => {
  assert.equal(isBlockedIp('10.1.2.3'), true);
  assert.equal(isBlockedIp('172.20.0.1'), true);
  assert.equal(isBlockedIp('192.168.1.1'), true);
  assert.equal(isBlockedIp('100.64.0.1'), true);
  assert.equal(isBlockedIp('8.8.8.8'), false);
  assert.equal(isBlockedIp('fc00::1'), true);
  assert.equal(isBlockedIp('2001:4860:4860::8888'), false);
});

test('redirect targets are revalidated before a second network request', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } });
  };
  await assert.rejects(
    fetchPublicHtml('https://example.com/', {
      fetchImpl,
      resolveHost: async () => ['93.184.216.34'],
    }),
    /PRIVATE_ADDRESS/,
  );
  assert.equal(calls, 1);
});

test('HTML response is bounded by bytes', async () => {
  const fetchImpl = async () => new Response('x'.repeat(30), { status: 200, headers: { 'content-type': 'text/html' } });
  await assert.rejects(
    fetchPublicHtml('https://example.com/', {
      fetchImpl,
      resolveHost: async () => ['93.184.216.34'],
      limits: { maxBytes: 10, maxRedirects: 1, timeoutMs: 1000 },
    }),
    /PAGE_TOO_LARGE/,
  );
});

test('public HTML can be fetched through the bounded read-only path', async () => {
  const fetchImpl = async (url) => {
    assert.equal(url, 'https://example.com/');
    return new Response('<!doctype html><title>OK</title><h1>OK</h1>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  };
  const result = await fetchPublicHtml('https://example.com/', {
    fetchImpl,
    resolveHost: async () => ['93.184.216.34'],
  });
  assert.equal(result.status, 200);
  assert.match(result.html, /<h1>OK<\/h1>/);
  assert.equal(result.redirectCount, 0);
});
