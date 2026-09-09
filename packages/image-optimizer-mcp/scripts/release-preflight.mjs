import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const server = JSON.parse(fs.readFileSync(path.join(root, 'server.json'), 'utf8'));
const publishable = process.argv.includes('--publishable');

const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};

expect(pkg.private !== true, 'package.json must not contain private=true');
expect(pkg.name === '@layerporter/image-optimizer-mcp', 'unexpected npm package name');
expect(pkg.mcpName === server.name, 'package.json mcpName must exactly match server.json name');
expect(pkg.version === server.version, 'package.json version must match server.json version');
expect(Array.isArray(server.packages) && server.packages.length === 1, 'server.json must contain exactly one package entry');

const registryPackage = server.packages?.[0] ?? {};
expect(registryPackage.registryType === 'npm', 'server.json package registryType must be npm');
expect(registryPackage.identifier === pkg.name, 'server.json npm identifier must match package.json name');
expect(registryPackage.version === pkg.version, 'server.json package version must match package.json version');
expect(registryPackage.transport?.type === 'stdio', 'server.json transport must remain stdio');
expect(pkg.publishConfig?.access === 'public', 'npm publishConfig.access must be public');
expect(pkg.repository?.url === 'git+https://github.com/OlegStrateg/layerporter-site.git', 'repository.url must match the canonical GitHub repository');
expect(pkg.repository?.directory === 'packages/image-optimizer-mcp', 'repository.directory must point to the monorepo package');
expect(pkg.bin?.['layerporter-image-optimizer-mcp'] === 'src/server.js', 'expected MCP executable is missing');

if (publishable) {
  expect(pkg.license && pkg.license !== 'UNLICENSED', 'publication blocked: license decision is unresolved');
}

const result = {
  status: errors.length ? 'BLOCKED' : 'PASS',
  mode: publishable ? 'publishable' : 'candidate',
  package: pkg.name,
  version: pkg.version,
  mcpName: pkg.mcpName,
  license: pkg.license ?? null,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
