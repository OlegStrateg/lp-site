import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, readdir, readlink, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(here, '..');
const repoRoot = path.resolve(packageDir, '../..');
const publicSpec = process.env.LP_PUBLIC_PACKAGE_SPEC || '@layerporter/image-optimizer-mcp@0.1.0';
const releaseSha = process.env.LP_RELEASE_SOURCE_SHA || '8ca11132b8cec267d1b88ff85232d58483353c63';
const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'lp098-public-npm-'));
const proofDir = process.env.LP_PUBLIC_PROOF_DIR
  ? path.resolve(process.env.LP_PUBLIC_PROOF_DIR)
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

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function fileManifest(root) {
  const rows = [];
  async function walk(dir, relative = '') {
    const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = path.posix.join(relative.split(path.sep).join('/'), entry.name);
      if (entry.isDirectory()) {
        await walk(abs, rel);
      } else if (entry.isSymbolicLink()) {
        rows.push([rel, `symlink:${await readlink(abs)}`]);
      } else if (entry.isFile()) {
        rows.push([rel, sha256(await readFile(abs))]);
      }
    }
  }
  await walk(root);
  return rows;
}

function parsePackJson(stdout) {
  const value = JSON.parse(stdout.trim());
  assert.equal(Array.isArray(value), true, 'npm pack --json must return an array');
  assert.equal(value.length, 1, 'npm pack must produce exactly one tarball');
  return value[0];
}

function parseToolJson(result) {
  const text = result.content.find((item) => item.type === 'text')?.text;
  assert.ok(text, 'tool result must include JSON text');
  return { text, value: JSON.parse(text) };
}

let client = null;
let sourceWorktree = null;

try {
  const publicPackDir = path.join(tmpRoot, 'public-pack');
  const sourcePackDir = path.join(tmpRoot, 'source-pack');
  const publicExtract = path.join(tmpRoot, 'public-extract');
  const sourceExtract = path.join(tmpRoot, 'source-extract');
  const installDir = path.join(tmpRoot, 'install');
  await Promise.all([
    mkdir(publicPackDir, { recursive: true }),
    mkdir(sourcePackDir, { recursive: true }),
    mkdir(publicExtract, { recursive: true }),
    mkdir(sourceExtract, { recursive: true }),
    mkdir(installDir, { recursive: true }),
  ]);

  const npmView = JSON.parse(run('npm', ['view', publicSpec, 'name', 'version', 'dist.integrity', 'dist.shasum', 'dist.tarball', '--json'], tmpRoot).stdout);
  assert.equal(npmView.name, '@layerporter/image-optimizer-mcp');
  assert.equal(npmView.version, '0.1.0');

  const publicPack = parsePackJson(run('npm', ['pack', publicSpec, '--json', '--pack-destination', publicPackDir], tmpRoot).stdout);
  const publicTarball = path.join(publicPackDir, publicPack.filename);

  sourceWorktree = path.join(tmpRoot, 'release-source');
  run('git', ['worktree', 'add', '--detach', sourceWorktree, releaseSha], repoRoot);
  const sourcePackageDir = path.join(sourceWorktree, 'packages/image-optimizer-mcp');
  const sourcePack = parsePackJson(run('npm', ['pack', '--json', '--pack-destination', sourcePackDir], sourcePackageDir).stdout);
  const sourceTarball = path.join(sourcePackDir, sourcePack.filename);

  run('tar', ['-xzf', publicTarball, '-C', publicExtract], tmpRoot);
  run('tar', ['-xzf', sourceTarball, '-C', sourceExtract], tmpRoot);
  const publicManifest = await fileManifest(path.join(publicExtract, 'package'));
  const sourceManifest = await fileManifest(path.join(sourceExtract, 'package'));
  assert.deepEqual(publicManifest, sourceManifest, 'public npm package contents differ from authorized release source');

  await writeFile(path.join(installDir, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2));
  run('npm', ['install', '--no-audit', '--no-fund', publicSpec, '@modelcontextprotocol/client@^2.0.0'], installDir);

  const installedPackageDir = path.join(installDir, 'node_modules/@layerporter/image-optimizer-mcp');
  const installedPackageJson = JSON.parse(await readFile(path.join(installedPackageDir, 'package.json'), 'utf8'));
  const installedServerJson = JSON.parse(await readFile(path.join(installedPackageDir, 'server.json'), 'utf8'));
  assert.equal(installedPackageJson.name, '@layerporter/image-optimizer-mcp');
  assert.equal(installedPackageJson.version, '0.1.0');
  assert.equal(installedPackageJson.mcpName, 'com.layerporter/website-image-optimizer');
  assert.equal(installedServerJson.name, installedPackageJson.mcpName);

  const requireFromInstall = createRequire(path.join(installDir, 'package.json'));
  const { Client } = await import(pathToFileURL(requireFromInstall.resolve('@modelcontextprotocol/client')).href);
  const { StdioClientTransport } = await import(pathToFileURL(requireFromInstall.resolve('@modelcontextprotocol/client/stdio')).href);
  const sharpModule = await import(pathToFileURL(createRequire(path.join(installedPackageDir, 'package.json')).resolve('sharp')).href);
  const sharp = sharpModule.default;
  const clientPackageJson = JSON.parse(await readFile(path.join(installDir, 'node_modules/@modelcontextprotocol/client/package.json'), 'utf8'));

  const serverPath = path.join(installedPackageDir, 'src/server.js');
  client = new Client({ name: 'layerporter-public-npm-smoke', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: installDir });
  await client.connect(transport);

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
      width: 320,
      height: 240,
      channels: 3,
      background: { r: 74, g: 142, b: 218 },
    },
  }).jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer();

  const result = await client.callTool({
    name: 'optimize_image',
    arguments: { imageBase64: source.toString('base64'), target: { width: 160 } },
  });
  assert.equal(result.isError, undefined);
  const link = result.content.find((item) => item.type === 'resource_link');
  assert.ok(link, 'optimize_image must return resource_link');
  const toolJson = parseToolJson(result);
  assert.equal(toolJson.value.status, 'ACCEPT');
  assert.equal(toolJson.text.includes(source.toString('base64')), false, 'tool text must not echo source base64');

  const resource = await client.readResource({ uri: link.uri });
  const binary = resource.contents.find((item) => typeof item.blob === 'string');
  assert.ok(binary?.blob, 'resources/read must return a binary blob');
  const output = Buffer.from(binary.blob, 'base64');
  const outputSha256 = sha256(output);
  assert.equal(output.length, link.size);
  assert.equal(binary.mimeType, link.mimeType);
  assert.equal(binary._meta?.size, output.length);
  assert.equal(binary._meta?.sha256, outputSha256);

  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 160);
  assert.ok(metadata.height > 0);
  const decoded = await sharp(output).raw().toBuffer();
  assert.ok(decoded.length > 0, 'public package output must fully decode');

  const outputPath = path.join(proofDir, 'public-optimized.webp');
  await writeFile(outputPath, output);

  const report = {
    status: 'PASS',
    publicPackage: {
      spec: publicSpec,
      name: installedPackageJson.name,
      version: installedPackageJson.version,
      npmIntegrity: npmView.dist?.integrity ?? npmView['dist.integrity'] ?? null,
      npmShasum: npmView.dist?.shasum ?? npmView['dist.shasum'] ?? null,
      npmTarball: npmView.dist?.tarball ?? npmView['dist.tarball'] ?? null,
      cleanInstallOutsideMonorepo: true,
    },
    sourceEquivalence: {
      authorizedReleaseSha: releaseSha,
      publicFileCount: publicManifest.length,
      sourceFileCount: sourceManifest.length,
      exactFileContentMatch: true,
    },
    mcpClient: {
      package: '@modelcontextprotocol/client',
      version: clientPackageJson.version,
      transport: 'stdio',
      initialize: 'PASS',
      toolsList: 'PASS',
      toolCount: toolNames.length,
      tools: toolNames,
      resourceTemplate: 'optimized-image-artifact',
    },
    optimizeResourceRead: {
      status: toolJson.value.status,
      uri: link.uri,
      bytes: output.length,
      sha256: outputSha256,
      mimeType: binary.mimeType,
      width: metadata.width,
      height: metadata.height,
      fullDecode: 'PASS',
    },
  };

  await writeFile(path.join(proofDir, 'lp098-public-npm-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  if (client) await client.close().catch(() => {});
  if (sourceWorktree) {
    spawnSync('git', ['worktree', 'remove', '--force', sourceWorktree], { cwd: repoRoot, stdio: 'ignore' });
  }
  await rm(tmpRoot, { recursive: true, force: true });
}
