import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const server = JSON.parse(fs.readFileSync(path.join(root, 'server.json'), 'utf8'));
const publishable = process.argv.includes('--publishable');
const licensePath = path.join(root, 'LICENSE');

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
expect(pkg.repository?.url === 'git+https://github.com/OlegStrateg/lp-site.git', 'repository.url must match the canonical GitHub repository');
expect(pkg.repository?.directory === 'packages/image-optimizer-mcp', 'repository.directory must point to the monorepo package');
expect(pkg.bin?.['layerporter-image-optimizer-mcp'] === 'src/server.js', 'expected MCP executable is missing');
expect(pkg.license === 'SEE LICENSE IN LICENSE', 'package must use the explicit proprietary LICENSE file');
expect(fs.existsSync(licensePath), 'LICENSE file is missing');

let licenseText = '';
if (fs.existsSync(licensePath)) {
  licenseText = fs.readFileSync(licensePath, 'utf8');
  expect(licenseText.includes('LayerPorter Proprietary Software License'), 'LICENSE must identify the LayerPorter proprietary license');
  expect(licenseText.includes('licensed, not sold'), 'LICENSE must preserve proprietary ownership language');
  expect(licenseText.includes('modify, adapt, translate, alter, or create derivative works'), 'LICENSE must preserve modification restrictions');
}

if (publishable) {
  expect(pkg.license === 'SEE LICENSE IN LICENSE', 'publication blocked: proprietary license metadata is unresolved');
  expect(licenseText.length > 500, 'publication blocked: proprietary LICENSE file is incomplete');
}

const result = {
  status: errors.length ? 'BLOCKED' : 'PASS',
  mode: publishable ? 'publishable' : 'candidate',
  package: pkg.name,
  version: pkg.version,
  mcpName: pkg.mcpName,
  license: pkg.license ?? null,
  licenseFile: fs.existsSync(licensePath) ? 'LICENSE' : null,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
