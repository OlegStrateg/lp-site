import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(here, '..');
const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'lp096-tarball-smoke-'));
const proofDir = process.env.LP096_PROOF_DIR
  ? path.resolve(process.env.LP096_PROOF_DIR)
  : path.join(tmpRoot, 'proof');
await mkdir(proofDir, { recursive: true });

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: '1' },
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`command failed: ${command} ${args.join(' ')} (exit ${result.status})`);
  }
  return result;
}

function collectArtifacts(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectArtifacts(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (value.artifact?.uri) out.push(value.artifact);
  for (const item of Object.values(value)) collectArtifacts(item, out);
  return out;
}

function toolJson(result) {
  const text = result.content.find((item) => item.type === 'text')?.text;
  assert.ok(text, 'tool result must include JSON text');
  return { text, value: JSON.parse(text) };
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function expectResourceError(client, uri) {
  try {
    await client.readResource({ uri });
  } catch (error) {
    return error;
  }
  throw new Error(`expected resources/read to fail for ${uri}`);
}

let packedTarballPath = null;
let client = null;

try {
  const pack = run('npm', ['pack', '--json'], packageDir);
  const packJson = JSON.parse(pack.stdout.trim());
  assert.equal(Array.isArray(packJson), true);
  assert.equal(packJson.length, 1);
  const packedFilename = packJson[0].filename;
  packedTarballPath = path.join(packageDir, packedFilename);
  const tarballCopy = path.join(tmpRoot, packedFilename);
  await cp(packedTarballPath, tarballCopy);

  await writeFile(path.join(tmpRoot, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2));
  run('npm', [
    'install', '--no-audit', '--no-fund',
    tarballCopy,
    '@modelcontextprotocol/client@^2.0.0',
  ], tmpRoot);

  const installedPackageDir = path.join(tmpRoot, 'node_modules/@layerporter/image-optimizer-mcp');
  const installedPackageJson = JSON.parse(await readFile(path.join(installedPackageDir, 'package.json'), 'utf8'));
  const installedCore = path.join(installedPackageDir, 'src/image-core/index.js');
  await readFile(installedCore);
  const installedRealPath = await realpath(installedPackageDir);
  assert.ok(installedRealPath.startsWith(tmpRoot), `installed package escaped temp root: ${installedRealPath}`);

  const requireFromTemp = createRequire(path.join(tmpRoot, 'package.json'));
  const { Client } = await import(pathToFileURL(requireFromTemp.resolve('@modelcontextprotocol/client')).href);
  const { StdioClientTransport } = await import(pathToFileURL(requireFromTemp.resolve('@modelcontextprotocol/client/stdio')).href);
  const sharpModule = await import(pathToFileURL(requireFromTemp.resolve('sharp')).href);
  const sharp = sharpModule.default;

  const clientPackageJson = JSON.parse(await readFile(path.join(tmpRoot, 'node_modules/@modelcontextprotocol/client/package.json'), 'utf8'));
  const serverPath = path.join(installedPackageDir, 'src/server.js');
  client = new Client({ name: 'layerporter-release-tarball-smoke', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: tmpRoot });
  await client.connect(transport); // Performs the MCP initialize handshake.

  const { tools } = await client.listTools();
  const toolNames = tools.map((tool) => tool.name).sort();
  const expectedTools = [
    'analyze_page_images',
    'analyze_url_images',
    'compare_image_versions',
    'generate_responsive_variants',
    'optimize_image',
    'optimize_page_images',
    'optimize_url_images',
  ].sort();
  assert.deepEqual(toolNames, expectedTools);

  const { resourceTemplates } = await client.listResourceTemplates();
  assert.ok(resourceTemplates.some((resource) => resource.name === 'optimized-image-artifact'));

  const source = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 74, g: 142, b: 218 },
    },
  }).jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();
  const sourceBase64 = source.toString('base64');

  async function verifyLinkedArtifact(link, artifact, expectedWidth, outputName) {
    assert.equal(link.uri, artifact.uri);
    assert.equal(link.size, artifact.size);
    assert.equal(link.mimeType, artifact.mimeType);

    const first = await client.readResource({ uri: link.uri });
    const binary = first.contents.find((item) => typeof item.blob === 'string');
    assert.ok(binary?.blob, 'resources/read must return a blob');
    const buffer = Buffer.from(binary.blob, 'base64');
    const hash = sha256(buffer);

    assert.equal(buffer.length, link.size);
    assert.equal(buffer.length, artifact.size);
    assert.equal(binary.mimeType, link.mimeType);
    assert.equal(binary._meta?.size, buffer.length);
    assert.equal(binary._meta?.sha256, hash);
    assert.equal(artifact.sha256, hash);

    const metadata = await sharp(buffer).metadata();
    assert.equal(metadata.width, expectedWidth);
    assert.ok(metadata.height > 0);
    const decodedPixels = await sharp(buffer).raw().toBuffer();
    assert.ok(decodedPixels.length > 0, 'optimized image must fully decode');

    const second = await client.readResource({ uri: link.uri });
    const secondBlob = second.contents.find((item) => typeof item.blob === 'string')?.blob;
    assert.equal(secondBlob, binary.blob, 'temporary artifact must be repeat-readable while alive');

    const outputPath = path.join(proofDir, outputName);
    await writeFile(outputPath, buffer);
    return {
      uri: link.uri,
      file: outputPath,
      bytes: buffer.length,
      sha256: hash,
      mimeType: binary.mimeType,
      width: metadata.width,
      height: metadata.height,
      fullDecode: 'PASS',
      repeatedRead: 'PASS',
    };
  }

  const singleResult = await client.callTool({
    name: 'optimize_image',
    arguments: { imageBase64: sourceBase64, target: { width: 320 } },
  });
  assert.equal(singleResult.isError, undefined);
  const singleLink = singleResult.content.find((item) => item.type === 'resource_link');
  assert.ok(singleLink, 'optimize_image must return resource_link for ACCEPT');
  const singleJson = toolJson(singleResult);
  assert.equal(singleJson.text.includes(sourceBase64), false, 'tool text must not contain source base64');
  assert.equal(singleJson.value.status, 'ACCEPT');
  const [singleArtifact] = collectArtifacts(singleJson.value);
  assert.ok(singleArtifact);
  const singleProof = await verifyLinkedArtifact(singleLink, singleArtifact, 320, 'single-optimized.webp');

  const batchResult = await client.callTool({
    name: 'optimize_page_images',
    arguments: {
      items: [
        { id: 'batch-400', imageBase64: sourceBase64, target: { width: 400 } },
        { id: 'batch-300', imageBase64: sourceBase64, target: { width: 300 } },
      ],
      maxItems: 2,
    },
  });
  const batchJson = toolJson(batchResult);
  assert.equal(batchJson.value.status, 'ACCEPT');
  assert.equal(batchJson.value.processed, 2);
  assert.equal(batchJson.value.accepted, 2);
  assert.equal(batchJson.text.includes(sourceBase64), false);
  const batchLinks = batchResult.content.filter((item) => item.type === 'resource_link');
  const batchArtifacts = collectArtifacts(batchJson.value);
  assert.equal(batchLinks.length, 2);
  assert.equal(batchArtifacts.length, 2);
  const batchProof = [];
  for (const item of batchJson.value.results) {
    assert.ok(item.artifact?.uri, `batch result ${item.id} must be linked to an artifact`);
    const link = batchLinks.find((candidate) => candidate.uri === item.artifact.uri);
    assert.ok(link);
    batchProof.push(await verifyLinkedArtifact(link, item.artifact, item.output.width, `${item.id}.webp`));
  }
  assert.deepEqual(batchJson.value.results.map((item) => item.output.width).sort((a, b) => a - b), [300, 400]);

  const variantsResult = await client.callTool({
    name: 'generate_responsive_variants',
    arguments: { imageBase64: sourceBase64, widths: [160, 320, 640], maxVariants: 3 },
  });
  const variantsJson = toolJson(variantsResult);
  assert.equal(variantsJson.value.status, 'ACCEPT');
  const variantLinks = variantsResult.content.filter((item) => item.type === 'resource_link');
  assert.equal(variantLinks.length, 3);
  const variantProof = [];
  for (const variant of variantsJson.value.variants) {
    assert.equal(variant.status, 'ACCEPT');
    assert.ok(variant.artifact?.uri);
    const link = variantLinks.find((candidate) => candidate.uri === variant.artifact.uri);
    assert.ok(link);
    variantProof.push(await verifyLinkedArtifact(link, variant.artifact, variant.width, `variant-${variant.width}.webp`));
  }
  assert.deepEqual(variantsJson.value.variants.map((item) => item.width), [160, 320, 640]);

  const transparent = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.4 },
    },
  }).png().toBuffer();
  const rejectResult = await client.callTool({
    name: 'optimize_image',
    arguments: {
      imageBase64: transparent.toString('base64'),
      policy: { format: 'jpeg', preserveAlpha: true },
    },
  });
  const rejectJson = toolJson(rejectResult);
  assert.equal(rejectJson.value.status, 'REJECT');
  assert.equal(rejectJson.value.reason, 'alpha_would_be_lost');
  assert.equal(rejectResult.content.some((item) => item.type === 'resource_link'), false);

  const unknownError = await expectResourceError(client, 'layerporter-artifact://artifact/00000000000000000000000000000000');
  assert.ok(unknownError);

  const artifactStoreModule = await import(pathToFileURL(path.join(installedPackageDir, 'src/artifact-store.js')).href);
  const ephemeralStore = new artifactStoreModule.ArtifactStore({
    rootDir: path.join(tmpRoot, 'ephemeral-artifacts'),
    ttlMs: 20,
    maxArtifacts: 1,
    maxArtifactBytes: 1024,
    maxTotalBytes: 1024,
  });
  const ephemeral = await ephemeralStore.put(Buffer.from('ephemeral-proof'), { name: 'ephemeral.bin' });
  await ephemeralStore.read(ephemeral.uri);
  await ephemeralStore.read(ephemeral.uri);
  let storeLimitCode = null;
  try {
    await ephemeralStore.put(Buffer.from('second'));
  } catch (error) {
    storeLimitCode = error.code;
  }
  assert.equal(storeLimitCode, 'ARTIFACT_STORE_FULL');
  await new Promise((resolve) => setTimeout(resolve, 35));
  let expiredCode = null;
  try {
    await ephemeralStore.read(ephemeral.uri);
  } catch (error) {
    expiredCode = error.code;
  }
  assert.ok(['ARTIFACT_NOT_FOUND', 'ARTIFACT_EXPIRED'].includes(expiredCode));
  await ephemeralStore.dispose();

  const report = {
    status: 'PASS',
    package: {
      name: installedPackageJson.name,
      version: installedPackageJson.version,
      tarball: packedFilename,
      cleanInstallOutsideMonorepo: true,
      generatedImageCorePackaged: true,
    },
    client: {
      package: '@modelcontextprotocol/client',
      version: clientPackageJson.version,
      transport: 'stdio',
      initialize: 'PASS',
      toolsList: 'PASS',
      toolCount: toolNames.length,
      tools: toolNames,
      resourceTemplate: 'optimized-image-artifact',
    },
    optimizeResourceRead: singleProof,
    batch: { status: 'PASS', count: batchProof.length, outputs: batchProof },
    variants: { status: 'PASS', widths: variantProof.map((item) => item.width), outputs: variantProof },
    reject: { status: rejectJson.value.status, reason: rejectJson.value.reason, resourceLinkCount: 0 },
    temporaryResources: {
      repeatedRead: 'PASS',
      unknownUriRejected: true,
      storeLimitCode,
      expiredUriRejected: true,
      expiredCode,
    },
  };
  const reportPath = path.join(proofDir, 'lp096-release-tarball-smoke.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  if (client) await client.close().catch(() => {});
  if (packedTarballPath) await rm(packedTarballPath, { force: true }).catch(() => {});
  await rm(tmpRoot, { recursive: true, force: true });
}
