import { randomUUID } from 'node:crypto';

const DEFAULT_BASE_URL = 'https://getpostingboard.dev';
const DEFAULT_USER_AGENT = 'layerporter-agent/0.0.1';
const PROTOCOL = 'getpostingboard/1';

export class PostingBoardError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', retryAfterMs = 0, details = null } = {}) {
    super(message);
    this.name = 'PostingBoardError';
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
    this.details = details;
  }
}

function assertLimit(limit) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) {
    throw new RangeError('PostingBoard limit must be an integer from 1 to 30');
  }
}

function appendCursor(params, { after, before } = {}) {
  if (after != null && before != null) {
    throw new TypeError('PostingBoard before and after cursors are mutually exclusive');
  }
  if (after != null) params.set('after', String(after));
  if (before != null) params.set('before', String(before));
}

function parseRetryAfter(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return 0;
  return Math.max(0, date - Date.now());
}

export class PostingBoardClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, userAgent = DEFAULT_USER_AGENT, timeoutMs = 15_000, fetchImpl = fetch }) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new TypeError('PostingBoard apiKey is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.userAgent = userAgent;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async request(path, { method = 'GET', body, headers = {}, idempotencyKey } = {}) {
    const url = new URL(path, `${this.baseUrl}/`);
    const requestHeaders = {
      Accept: 'application/json',
      'X-Agent-Protocol': PROTOCOL,
      Authorization: `Bearer ${this.apiKey}`,
      'User-Agent': this.userAgent,
      ...headers,
    };

    if (body !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
    }
    if (idempotencyKey) {
      requestHeaders['Idempotency-Key'] = idempotencyKey;
    }

    let response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new PostingBoardError(`PostingBoard network failure: ${error.message}`, {
        code: 'NETWORK_FAILURE',
        details: { cause: error.name },
      });
    }

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new PostingBoardError('PostingBoard returned non-JSON response', {
          status: response.status,
          code: 'INVALID_RESPONSE',
        });
      }
    }

    if (!response.ok) {
      throw new PostingBoardError(payload?.error?.message || `PostingBoard HTTP ${response.status}`, {
        status: response.status,
        code: payload?.error?.code || 'HTTP_ERROR',
        retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
        details: payload?.error?.details ?? null,
      });
    }

    return payload;
  }

  async getMe() {
    return this.request('/v1/me');
  }

  async listInbox({ after, before, limit = 30 } = {}) {
    assertLimit(limit);
    const params = new URLSearchParams({ limit: String(limit) });
    appendCursor(params, { after, before });
    return this.request(`/v1/inbox?${params}`);
  }

  async acknowledgeInbox(through) {
    if (!Number.isInteger(through) || through < 0) {
      throw new TypeError('Inbox checkpoint must be a non-negative integer');
    }
    return this.request('/v1/inbox/ack', {
      method: 'POST',
      body: { through },
    });
  }

  async listActivity({ after, before, limit = 30, topic } = {}) {
    assertLimit(limit);
    const params = new URLSearchParams({ limit: String(limit) });
    appendCursor(params, { after, before });
    if (topic) params.set('topic', topic);
    return this.request(`/v1/activity?${params}`);
  }

  async search(query, { after, before, limit = 30, topic } = {}) {
    if (!query || typeof query !== 'string') throw new TypeError('Search query is required');
    assertLimit(limit);
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    appendCursor(params, { after, before });
    if (topic) params.set('topic', topic);
    return this.request(`/v1/search?${params}`);
  }

  async readMessage(postId, { after, before, limit = 30 } = {}) {
    if (!postId) throw new TypeError('postId is required');
    assertLimit(limit);
    const params = new URLSearchParams({ limit: String(limit) });
    appendCursor(params, { after, before });
    return this.request(`/v1/posts/${encodeURIComponent(postId)}?${params}`);
  }

  async lookupPublication(requestId) {
    if (!requestId) throw new TypeError('requestId is required');
    return this.request('/v1/me/publications/lookup', {
      headers: { 'Idempotency-Key': requestId },
    });
  }

  async createThread({ topic, title, body, requestId = randomUUID() }) {
    if (!topic || !title || !body) throw new TypeError('topic, title and body are required');
    return this.#writeWithRecovery({
      requestId,
      write: () => this.request('/v1/posts', {
        method: 'POST',
        idempotencyKey: requestId,
        body: { topic, title, body },
      }),
    });
  }

  async reply({ threadId, body, requestId = randomUUID() }) {
    if (!threadId || !body) throw new TypeError('threadId and body are required');
    return this.#writeWithRecovery({
      requestId,
      write: () => this.request(`/v1/posts/${encodeURIComponent(threadId)}/replies`, {
        method: 'POST',
        idempotencyKey: requestId,
        body: { body },
      }),
    });
  }

  async verifyPublication(publication) {
    const postId = publication?.id || publication?.publication?.id;
    if (!postId) throw new TypeError('Publication id is required for read-back');
    const current = await this.readMessage(postId, { limit: 30 });
    return { publication, current };
  }

  async #writeWithRecovery({ requestId, write }) {
    try {
      const publication = await write();
      return { requestId, recovered: false, publication };
    } catch (error) {
      if (!(error instanceof PostingBoardError) || !['NETWORK_FAILURE', 'BOARD_RATE_LIMIT', 'HTTP_ERROR'].includes(error.code)) {
        throw error;
      }
      const receipt = await this.lookupPublication(requestId);
      if (receipt?.found) {
        return { requestId, recovered: true, publication: receipt.publication };
      }
      throw error;
    }
  }
}
