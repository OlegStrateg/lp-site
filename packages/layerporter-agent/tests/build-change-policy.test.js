import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBuildChange } from '../src/build-change-policy.js';

test('runtime audit request alone is audit-only', () => {
  assert.equal(classifyBuildChange([
    'packages/layerporter-agent/runtime-audit-request.json',
  ]), 'audit_request_only');
});

test('agent runtime or deploy changes require agent deployment', () => {
  assert.equal(classifyBuildChange([
    'packages/layerporter-agent/src/worker.js',
  ]), 'agent_change');
  assert.equal(classifyBuildChange([
    'wrangler-layerporter-agent.toml.example',
  ]), 'agent_change');
});

test('unrelated monorepo changes do not redeploy the agent', () => {
  assert.equal(classifyBuildChange([
    'src/pages/index.astro',
    'public/favicon.ico',
  ]), 'unrelated');
});

test('empty/unknown change set fails toward deployment instead of silently skipping', () => {
  assert.equal(classifyBuildChange([]), 'unknown');
});
