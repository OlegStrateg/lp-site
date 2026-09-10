import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(here, '../src/server.js');
const targetUrl = process.env.LP095_LIVE_URL || 'https://layerporter.com/';

function parseText(result) {
  const text = result.content.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error('missing text result');
  return JSON.parse(text);
}

function collectArtifacts(value, out = new Map()) {
  if (Array.isArray(value)) {
    for (const item of value) collectArtifacts(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (value.artifact?.uri) out.set(value.artifact.uri, value.artifact);
  for (const item of Object.values(value)) collectArtifacts(item, out);
  return out;
}

const client = new Client({ name: 'layerporter-live-url-artifact-smoke', version: '1.0.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath] });

try {
  await client.connect(transport);

  const analyzedCall = await client.callTool({
    name: 'analyze_url_images',
    arguments: { url: targetUrl, maxImages: 4 },
  });
  assert.equal(analyzedCall.isError, undefined);
  const analyzed = parseText(analyzedCall);
  assert.equal(analyzed.browserMetrics, false);
  assert.ok(analyzed.fetched > 0, 'live URL analysis must fetch at least one image');

  const optimizedCall = await client.callTool({
    name: 'optimize_url_images',
    arguments: { url: targetUrl, maxImages: 4 },
  });
  assert.equal(optimizedCall.isError, undefined);
  const optimized = parseText(optimizedCall);
  const links = optimizedCall.content.filter((item) => item.type === 'resource_link');
  assert.ok(optimized.processed > 0, 'live URL optimization must process at least one image');
  assert.ok(optimized.accepted > 0, 'live URL optimization must accept at least one real image');
  assert.equal(links.length, optimized.accepted);

  const metadataByUri = collectArtifacts(optimized);
  const artifacts = [];
  for (const link of links) {
    const metadata = metadataByUri.get(link.uri);
    assert.ok(metadata, `missing artifact metadata for ${link.uri}`);
    const resource = await client.readResource({ uri: link.uri });
    const binary = resource.contents.find((item) => typeof item.blob === 'string');
    assert.ok(binary?.blob, `missing blob for ${link.uri}`);
    const buffer = Buffer.from(binary.blob, 'base64');
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    assert.equal(buffer.length, metadata.size);
    assert.equal(sha256, metadata.sha256);
    artifacts.push({
      name: metadata.name,
      mimeType: metadata.mimeType,
      bytes: metadata.size,
      sha256,
      integrity: 'PASS',
    });
  }

  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    targetUrl,
    analyze: {
      finalUrl: analyzed.page.finalUrl,
      imgTagCount: analyzed.page.imgTagCount,
      selectedImageCount: analyzed.page.selectedImageCount,
      fetched: analyzed.fetched,
      skipped: analyzed.skipped,
      browserMetrics: analyzed.browserMetrics,
    },
    optimize: {
      mode: optimized.mode,
      processed: optimized.processed,
      accepted: optimized.accepted,
      artifactLinks: links.length,
    },
    artifacts,
    productTruth: {
      remoteFetchPerformedByMcpTool: true,
      artifactReturnedAsResourceLink: true,
      artifactReadThroughMcpResources: true,
      binaryEmbeddedInToolText: false,
      productionWrite: false,
      browserRenderedMetricsClaimed: false,
    },
  }, null, 2)}\n`);
} finally {
  await client.close();
}
