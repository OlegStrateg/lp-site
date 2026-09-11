import test from 'node:test';
import assert from 'node:assert/strict';
import { PostingBoardClient } from '../src/postingboard-client.js';

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

test('PostingBoard client sends required protocol headers and explicit inbox cursor', async () => {
  const calls = [];
  const client = new PostingBoardClient({
    apiKey: 'test-key',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({ items: [], resume_after: 7 });
    },
  });

  await client.listInbox({ after: 0, limit: 10 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v1\/inbox\?limit=10&after=0$/);
  assert.equal(calls[0].init.headers.Accept, 'application/json');
  assert.equal(calls[0].init.headers['X-Agent-Protocol'], 'getpostingboard/1');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key');
  assert.match(calls[0].init.headers['User-Agent'], /^layerporter-agent\//);
});

test('reply preserves one idempotency key and direct reply target', async () => {
  const calls = [];
  const client = new PostingBoardClient({
    apiKey: 'test-key',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse({ id: 'reply-1', seq: 2, thread_id: 'thread-1', url: 'https://example.com/reply-1' }, 201);
    },
  });

  const result = await client.reply({
    threadId: 'thread-1',
    replyToId: 'source-reply-1',
    body: 'Technical reply',
    requestId: 'abcdefghijklmnop',
  });
  assert.equal(result.recovered, false);
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'abcdefghijklmnop');
  assert.deepEqual(JSON.parse(calls[0].init.body), { body: 'Technical reply', reply_to_id: 'source-reply-1' });
});

test('uncertain write uses original key for receipt lookup and never invents a retry key', async () => {
  const calls = [];
  const requestId = 'abcdefghijklmnop';
  const client = new PostingBoardClient({
    apiKey: 'test-key',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      if (calls.length === 1) {
        return jsonResponse({ error: { code: 'BOARD_UNAVAILABLE', message: 'unavailable' } }, 503);
      }
      return jsonResponse({ found: false, retained_only: true, scope: 'own_named_publications', note: 'not proof' });
    },
  });

  await assert.rejects(
    () => client.reply({ threadId: 'thread-1', body: 'Reply', requestId }),
    (error) => error.code === 'WRITE_UNCERTAIN' && error.details.requestId === requestId,
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers['Idempotency-Key'], requestId);
  assert.equal(calls[1].init.headers['Idempotency-Key'], requestId);
  assert.match(calls[1].url, /\/v1\/me\/publications\/lookup$/);
});

test('uncertain write recovers a retained publication receipt', async () => {
  let call = 0;
  const client = new PostingBoardClient({
    apiKey: 'test-key',
    fetchImpl: async () => {
      call += 1;
      if (call === 1) return jsonResponse({ error: { code: 'BOARD_UNAVAILABLE', message: 'unavailable' } }, 503);
      return jsonResponse({
        found: true,
        retained_only: true,
        scope: 'own_named_publications',
        publication: { id: 'reply-1', seq: 2, thread_id: 'thread-1', url: 'https://example.com/reply-1', created_at: 1 },
      });
    },
  });

  const result = await client.reply({ threadId: 'thread-1', body: 'Reply', requestId: 'abcdefghijklmnop' });
  assert.equal(result.recovered, true);
  assert.equal(result.publication.id, 'reply-1');
});
