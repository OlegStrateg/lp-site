import { extractPageFacts } from '../../packages/page-audit-core/src/html-facts.js';
import { auditPageFacts } from '../../packages/page-audit-core/src/audit.js';
import { fetchPublicHtml, URL_AUDIT_LIMITS } from '../../packages/page-audit-core/src/url-fetch.js';

const MAX_REQUEST_BYTES = 4096;

function responseHeaders(request) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  const origin = request.headers.get('origin') || '';
  if (origin === 'https://layerporter.com' || origin === 'https://www.layerporter.com') {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  return headers;
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request) });
}

function safeErrorCode(error) {
  const code = error instanceof Error ? error.message : String(error);
  const allowed = new Set([
    'INVALID_URL', 'UNSAFE_SCHEME', 'URL_CREDENTIALS_NOT_ALLOWED', 'UNSAFE_PORT',
    'PRIVATE_HOSTNAME', 'PRIVATE_ADDRESS', 'PRIVATE_DNS_ANSWER', 'DNS_LOOKUP_FAILED',
    'DNS_UNRESOLVED', 'PAGE_TOO_LARGE', 'TOO_MANY_REDIRECTS', 'REDIRECT_WITHOUT_LOCATION',
    'UNSUPPORTED_CONTENT_TYPE', 'REQUEST_TOO_LARGE', 'BAD_JSON', 'URL_REQUIRED',
  ]);
  if (allowed.has(code)) return code;
  if (error?.name === 'AbortError' || /timeout|abort/i.test(code)) return 'FETCH_TIMEOUT';
  return 'FETCH_FAILED';
}

export async function onRequestOptions({ request }) {
  const headers = responseHeaders(request);
  headers['access-control-allow-methods'] = 'POST, OPTIONS';
  headers['access-control-allow-headers'] = 'content-type';
  return new Response(null, { status: 204, headers });
}

export async function onRequestGet({ request }) {
  return json(request, {
    service: 'layerporter-page-audit',
    mode: 'single-public-url-read-only',
    limits: URL_AUDIT_LIMITS,
    writes: false,
    browserMetrics: false,
  });
}

export async function onRequestPost({ request }) {
  const requestId = crypto.randomUUID();
  try {
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > MAX_REQUEST_BYTES) throw new Error('REQUEST_TOO_LARGE');
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) throw new Error('REQUEST_TOO_LARGE');

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new Error('BAD_JSON');
    }
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url || url.length > 2048) throw new Error('URL_REQUIRED');

    const fetched = await fetchPublicHtml(url);
    const facts = extractPageFacts({
      url: fetched.url,
      html: fetched.html,
      status: fetched.status,
      headers: fetched.headers,
    });
    const report = auditPageFacts(facts);
    report.coverage.url_fetch = {
      state: 'checked',
      evidence: {
        finalUrl: fetched.url,
        status: fetched.status,
        redirectCount: fetched.redirectCount,
        maxBytes: fetched.limits.maxBytes,
        timeoutMs: fetched.limits.timeoutMs,
      },
      note: 'Static HTTP fetch only. Browser-rendered states, currentSrc, LCP, console and interaction are separate checks.',
    };

    return json(request, { requestId, status: 'ok', report });
  } catch (error) {
    const code = safeErrorCode(error);
    const status = ['REQUEST_TOO_LARGE', 'BAD_JSON', 'URL_REQUIRED', 'INVALID_URL', 'UNSAFE_SCHEME', 'URL_CREDENTIALS_NOT_ALLOWED', 'UNSAFE_PORT', 'PRIVATE_HOSTNAME', 'PRIVATE_ADDRESS', 'PRIVATE_DNS_ANSWER'].includes(code) ? 400 : 502;
    return json(request, { requestId, status: 'error', error: code }, status);
  }
}
