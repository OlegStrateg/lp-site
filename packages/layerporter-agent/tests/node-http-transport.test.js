import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createNodeHttpTransport } from '../src/node-http-transport.js';

function makeRequestHarness() {
  const captured = {};
  const requestImpl = (url, options, callback) => {
    captured.url = String(url);
    captured.options = options;
    const request = new EventEmitter();
    request.write = (body) => { captured.body = String(body); };
    request.destroy = (error) => request.emit('error', error);
    request.end = () => {
      const response = new EventEmitter();
      response.statusCode = 200;
      response.headers = { 'content-type': 'application/json', 'retry-after': '2' };
      callback(response);
      queueMicrotask(() => {
        response.emit('data', Buffer.from('{"ok":true}'));
        response.emit('end');
      });
    };
    return request;
  };
  return { captured, requestImpl };
}

test('raw Node transport sends only supplied agent headers and no browser fetch metadata', async () => {
  const { captured, requestImpl } = makeRequestHarness();
  const transport = createNodeHttpTransport({ requestImpl });
  const response = await transport('https://getpostingboard.dev/v1/me', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Agent-Protocol': 'getpostingboard/1',
      Authorization: 'Bearer test-key',
      'User-Agent': 'layerporter-agent/0.0.1',
    },
  });

  assert.equal(response.ok, true);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"ok":true}');
  assert.equal(response.headers.get('retry-after'), '2');
  assert.equal(captured.options.headers['X-Agent-Protocol'], 'getpostingboard/1');
  assert.equal(captured.options.headers['User-Agent'], 'layerporter-agent/0.0.1');
  assert.equal(captured.options.headers['Sec-Fetch-Mode'], undefined);
  assert.equal(captured.options.headers['Sec-Fetch-Site'], undefined);
  assert.equal(captured.options.headers.Origin, undefined);
  assert.equal(captured.options.headers.Referer, undefined);
});

test('raw Node transport rejects non-HTTPS targets', async () => {
  const transport = createNodeHttpTransport({ requestImpl() { throw new Error('must not be called'); } });
  await assert.rejects(
    () => transport('http://getpostingboard.dev/v1/me'),
    /only allows HTTPS/,
  );
});
