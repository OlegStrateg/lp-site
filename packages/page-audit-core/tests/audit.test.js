import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPageFacts } from '../src/html-facts.js';
import { auditPageFacts } from '../src/audit.js';

function audit(html, status = 200) {
  return auditPageFacts(extractPageFacts({ url: 'https://example.com/tool/', html, status }));
}

test('audit produces evidence-backed findings across directions and explicit coverage', () => {
  const report = audit(`<!doctype html><html><head><script type="application/ld+json">{bad}</script></head><body>
    <h1>Image Converter</h1><h1>Second H1</h1><img src="hero.png"><p>Short.</p>
  </body></html>`);

  const ids = new Set(report.findings.map((finding) => finding.id));
  assert.ok(ids.has('seo-title-missing'));
  assert.ok(ids.has('seo-description-missing'));
  assert.ok(ids.has('seo-h1-count'));
  assert.ok(ids.has('seo-canonical-missing'));
  assert.ok(ids.has('seo-jsonld-invalid'));
  assert.ok(ids.has('ai-content-thin-for-direct-answer'));
  assert.ok(ids.has('cro-primary-action-missing'));
  assert.ok(ids.has('img-alt-0'));
  assert.ok(ids.has('img-dimensions-0'));
  assert.equal(report.coverage.browser_rendered.state, 'not_checked');
  assert.equal(report.coverage.field_analytics.state, 'not_available');
  assert.equal(report.coverage.ai_mentions.state, 'not_checked');
  for (const finding of report.findings) assert.ok(finding.evidence.length > 0);
});

test('healthy static tool is not padded to three invented issues', () => {
  const report = audit(`<!doctype html><html lang="en"><head>
    <title>WebP to JPG Converter</title>
    <meta name="description" content="Convert WebP to JPG locally in your browser.">
    <link rel="canonical" href="https://example.com/tool/">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Example"},{"@type":"SoftwareApplication","name":"Converter"}]}</script>
  </head><body><main>
    <h1>WebP to JPG Converter</h1>
    <p>This converter changes a WebP file into a JPG in your browser. It explains format limitations and keeps the primary task available without requiring an account.</p>
    <input type="file"><button type="button">Choose file</button><a download>Download JPG</a>
  </main></body></html>`);

  assert.equal(report.findings.length, 0);
  assert.equal(report.topFindings.length, 0);
  assert.match(report.summary.note, /does not pad/i);
});

test('non-2xx response is a high-priority SEO finding', () => {
  const report = audit('<html><head><title>X</title></head><body><h1>X</h1><p>This is a sufficiently long explanatory paragraph that keeps the fixture focused on the HTTP response.</p></body></html>', 503);
  const finding = report.findings.find((item) => item.id === 'seo-http-status');
  assert.equal(finding.priority.level, 'high');
  assert.equal(finding.evidence[0].value, 503);
});
