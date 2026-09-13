import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPageFacts } from '../src/html-facts.js';

const HTML = `<!doctype html>
<html lang="en">
<head>
  <title>WebP to JPG Converter — LayerPorter</title>
  <meta name="description" content="Convert a WebP image to JPG locally.">
  <link rel="canonical" href="/convert/webp-to-jpg/">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Converter"}</script>
</head>
<body>
  <main>
    <h1>WebP to JPG Converter</h1>
    <p>This tool converts a WebP image to JPG locally in your browser and explains the important limitations before you download the result.</p>
    <input id="file" type="file" accept="image/webp">
    <button type="button">Choose file</button>
    <a id="download" download>Download JPG</a>
    <img src="/example.webp" alt="Example conversion" width="800" height="600">
  </main>
</body>
</html>`;

test('extractPageFacts normalizes core page facts without a browser', () => {
  const facts = extractPageFacts({ url: 'https://layerporter.com/convert/webp-to-jpg/', html: HTML });
  assert.equal(facts.title, 'WebP to JPG Converter — LayerPorter');
  assert.equal(facts.metaDescription, 'Convert a WebP image to JPG locally.');
  assert.equal(facts.canonical, 'https://layerporter.com/convert/webp-to-jpg/');
  assert.deepEqual(facts.h1, ['WebP to JPG Converter']);
  assert.equal(facts.hasFileInput, true);
  assert.equal(facts.hasDownloadControl, true);
  assert.equal(facts.images.length, 1);
  assert.equal(facts.images[0].alt, 'Example conversion');
  assert.equal(facts.jsonLd[0].valid, true);
  assert.ok(facts.wordCount > 10);
});

test('invalid JSON-LD is preserved as evidence instead of throwing', () => {
  const facts = extractPageFacts({
    url: 'https://example.com/',
    html: '<html><head><script type="application/ld+json">{bad}</script></head><body><h1>X</h1></body></html>',
  });
  assert.equal(facts.jsonLd.length, 1);
  assert.equal(facts.jsonLd[0].valid, false);
  assert.match(facts.jsonLd[0].error, /JSON|property|position|expected/i);
});
