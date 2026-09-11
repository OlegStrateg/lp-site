import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(here, '../src/server.js');

const source = await sharp({
  create: {
    width: 800,
    height: 600,
    channels: 3,
    background: { r: 80, g: 140, b: 220 },
  },
}).jpeg({ quality: 100 }).toBuffer();

const client = new Client({ name: 'layerporter-artifact-smoke', version: '1.0.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath] });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 7);
  assert.ok(tools.some((tool) => tool.name === 'optimize_url_images'));

  const { resourceTemplates } = await client.listResourceTemplates();
  assert.ok(resourceTemplates.some((resource) => resource.name === 'optimized-image-artifact'));

  const result = await client.callTool({
    name: 'optimize_image',
    arguments: {
      imageBase64: source.toString('base64'),
      target: { width: 320 },
    },
  });
  assert.equal(result.isError, undefined);
  const link = result.content.find((item) => item.type === 'resource_link');
  assert.ok(link, 'optimize_image must return a resource_link');
  const text = result.content.find((item) => item.type === 'text')?.text ?? '';
  assert.equal(text.includes(source.toString('base64')), false);

  const resource = await client.readResource({ uri: link.uri });
  const binary = resource.contents.find((item) => typeof item.blob === 'string');
  assert.ok(binary?.blob, 'artifact resource must contain binary blob');
  const candidate = Buffer.from(binary.blob, 'base64');
  assert.equal(candidate.length, link.size);
  assert.ok(candidate.length < source.length);

  const metadata = await sharp(candidate).metadata();
  assert.equal(metadata.width, 320);
  assert.ok(metadata.height > 0 && metadata.height <= 600);

  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    toolCount: tools.length,
    resourceTemplate: 'optimized-image-artifact',
    inputBytes: source.length,
    artifactBytes: candidate.length,
    artifactUri: link.uri,
    artifactMimeType: link.mimeType,
    outputWidth: metadata.width,
    outputHeight: metadata.height,
  }, null, 2)}\n`);
} finally {
  await client.close();
}
