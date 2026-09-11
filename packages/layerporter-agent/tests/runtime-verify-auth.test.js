import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { isRuntimeVerificationRequestAllowed } from '../src/runtime-verify-auth.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const url = 'https://layerporter-agent.example.workers.dev/__lp097/verify-runtime';
const env = {
  LAYERPORTER_AGENT_VERIFY_HTTP: 'true',
  LAYERPORTER_AGENT_WRITE_MODE: 'dry-run',
  LAYERPORTER_AGENT_VERIFY_TOKEN: 'a'.repeat(64),
};

test('verification route allows only exact POST + bearer token in dry-run verify mode', async () => {
  const request = new Request(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.LAYERPORTER_AGENT_VERIFY_TOKEN}` },
  });
  assert.equal(await isRuntimeVerificationRequestAllowed(request, env), true);
});

test('verification route fails closed for wrong path, method, mode, token or missing flag', async () => {
  const validHeaders = { Authorization: `Bearer ${env.LAYERPORTER_AGENT_VERIFY_TOKEN}` };
  assert.equal(await isRuntimeVerificationRequestAllowed(new Request(`${url}/x`, { method: 'POST', headers: validHeaders }), env), false);
  assert.equal(await isRuntimeVerificationRequestAllowed(new Request(url, { method: 'GET', headers: validHeaders }), env), false);
  assert.equal(await isRuntimeVerificationRequestAllowed(new Request(url, { method: 'POST', headers: { Authorization: 'Bearer wrong' } }), env), false);
  assert.equal(await isRuntimeVerificationRequestAllowed(new Request(url, { method: 'POST', headers: validHeaders }), { ...env, LAYERPORTER_AGENT_WRITE_MODE: 'live' }), false);
  assert.equal(await isRuntimeVerificationRequestAllowed(new Request(url, { method: 'POST', headers: validHeaders }), { ...env, LAYERPORTER_AGENT_VERIFY_HTTP: 'false' }), false);
});
