import test from 'node:test';
import assert from 'node:assert/strict';
import { createSafeLookup, isBlockedAddress, secureFetch, validateRemoteUrl } from '../src/secure-fetch.js';

function lookupPromise(lookup, hostname, options = {}) {
  return new Promise((resolve, reject) => {
    lookup(hostname, options, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });
}

test('private, loopback, link-local and reserved address ranges are blocked', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.10', '::1', 'fc00::1', 'fe80::1']) {
    assert.equal(isBlockedAddress(address), true, address);
  }
  assert.equal(isBlockedAddress('8.8.8.8'), false);
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false);
});

test('unsafe schemes, localhost and URL credentials are blocked before network access', () => {
  assert.throws(() => validateRemoteUrl('file:///etc/passwd'), (error) => error.code === 'UNSAFE_SCHEME');
  assert.throws(() => validateRemoteUrl('http://localhost:8080/'), (error) => error.code === 'PRIVATE_HOST_BLOCKED');
  assert.throws(() => validateRemoteUrl('http://127.0.0.1/'), (error) => error.code === 'PRIVATE_IP_BLOCKED');
  assert.throws(() => validateRemoteUrl('https://user:pass@example.com/'), (error) => error.code === 'URL_CREDENTIALS_BLOCKED');
});

test('socket lookup rejects DNS answers containing a private address', async () => {
  const lookup = createSafeLookup((_hostname, _options, callback) => callback(null, [
    { address: '93.184.216.34', family: 4 },
    { address: '10.0.0.7', family: 4 },
  ]));
  await assert.rejects(() => lookupPromise(lookup, 'example.com'), (error) => error.code === 'PRIVATE_DNS_BLOCKED');
});

test('socket lookup permits a public-only DNS answer', async () => {
  const lookup = createSafeLookup((_hostname, _options, callback) => callback(null, [
    { address: '93.184.216.34', family: 4 },
  ]));
  assert.deepEqual(await lookupPromise(lookup, 'example.com'), { address: '93.184.216.34', family: 4 });
});

test('redirects are revalidated and redirect-to-private is blocked', async () => {
  let calls = 0;
  const requestOnceImpl = async () => {
    calls += 1;
    return { status: 302, headers: { location: 'http://127.0.0.1/admin' }, body: Buffer.alloc(0), location: 'http://127.0.0.1/admin' };
  };
  await assert.rejects(
    () => secureFetch('https://example.com/start', { requestOnceImpl }),
    (error) => error.code === 'PRIVATE_IP_BLOCKED',
  );
  assert.equal(calls, 1);
});
