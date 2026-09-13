import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost } from '../../../functions/api/page-audit.js';

function dnsAnswer(name) {
  return new Response(JSON.stringify({ Status: 0, Answer: [{ name, type: 1, TTL: 60, data: '93.184.216.34' }] }), {
    status: 200,
    headers: { 'content-type': 'application/dns-json' },
  });
}

test('page-audit function exposes limits without claiming browser metrics', async () => {
  const request = new Request('https://layerporter.com/api/page-audit');
  const response = await onRequestGet({ request });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.mode, 'single-public-url-read-only');
  assert.equal(body.writes, false);
  assert.equal(body.browserMetrics, false);
});

test('page-audit function performs bounded URL audit and returns four-direction contract', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith('https://cloudflare-dns.com/dns-query')) return dnsAnswer('example.com');
    if (url === 'https://example.com/') {
      return new Response(`<!doctype html><html lang="en"><head>
        <title>Example Converter</title><meta name="description" content="Example description">
        <link rel="canonical" href="https://example.com/">
        <script type="application/ld+json">{"@type":"SoftwareApplication","name":"Example"}</script>
      </head><body><main><h1>Example Converter</h1>
        <p>This example converter explains what it does, what result it returns, and the material limitations before the user starts the task.</p>
        <input type="file"><button type="button">Choose file</button><a download>Download result</a>
      </main></body></html>`, { status: 200, headers: { 'content-type': 'text/html' } });
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  const request = new Request('https://layerporter.com/api/page-audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://layerporter.com' },
    body: JSON.stringify({ url: 'https://example.com/' }),
  });
  const response = await onRequestPost({ request });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.report.coverage.url_fetch.state, 'checked');
  for (const direction of ['seo', 'ai_search', 'cro', 'images_performance']) {
    assert.ok(direction in body.report.summary.byDirection);
  }
  assert.equal(body.report.coverage.browser_rendered.state, 'not_checked');
});

test('page-audit function rejects a private target without target fetch', async () => {
  const request = new Request('https://layerporter.com/api/page-audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data/' }),
  });
  const response = await onRequestPost({ request });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error, 'PRIVATE_ADDRESS');
});
