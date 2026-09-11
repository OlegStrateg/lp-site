import { cp, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'lp096-source-smoke-'));
const tmpPackages = path.join(tmpRoot, 'packages');

function copyFilter(source) {
  return !source.includes(`${path.sep}node_modules`) && !source.includes(`${path.sep}.git`);
}

async function copyPackage(name) {
  await cp(path.join(repoRoot, `packages/${name}`), path.join(tmpPackages, name), {
    recursive: true,
    filter: copyFilter,
  });
}

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
}

async function assertServerStarts(cwd) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, CI: '1' },
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  const outcome = await Promise.race([
    new Promise((resolve) => child.once('exit', (code, signal) => resolve({ exited: true, code, signal }))),
    new Promise((resolve) => setTimeout(() => resolve({ exited: false }), 700)),
  ]);

  if (outcome.exited) throw new Error(`stdio server exited before client connection: code=${outcome.code} signal=${outcome.signal}\n${stderr}`);
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', resolve));
}

try {
  await copyPackage('image-core');
  await copyPackage('image-optimizer-mcp');
  await copyPackage('page-audit-extension');

  const coreDir = path.join(tmpPackages, 'image-core');
  const mcpDir = path.join(tmpPackages, 'image-optimizer-mcp');
  await rm(path.join(mcpDir, 'src/image-core'), { recursive: true, force: true });

  run('npm', ['install', '--no-audit', '--no-fund'], coreDir);
  run('npm', ['test'], coreDir);
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], mcpDir);
  run('npm', ['run', 'release:preflight'], mcpDir);
  run('npm', ['run', 'sync:core'], mcpDir);
  run('npm', ['test'], mcpDir);
  await assertServerStarts(mcpDir);

  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    scenario: 'clean-source-readme-setup',
    generatedCoreInitiallyAbsent: true,
    imageCoreTests: 'PASS',
    releasePreflight: 'PASS',
    syncCore: 'PASS',
    mcpTests: 'PASS',
    stdioServerStart: 'PASS',
  }, null, 2)}\n`);
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}
