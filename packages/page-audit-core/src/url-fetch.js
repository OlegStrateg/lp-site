const DEFAULT_LIMITS = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  maxRedirects: 3,
  timeoutMs: 8000,
});

function parseIpv4(value) {
  const parts = String(value).split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

export function isBlockedIp(value) {
  const ipv4 = parseIpv4(value);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    if (a === 192 && b === 0) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51) return true;
    if (a === 203 && b === 0) return true;
    return false;
  }

  const ip = String(value).toLowerCase().replace(/^\[|\]$/g, '');
  if (!ip.includes(':')) return false;
  if (ip === '::' || ip === '::1') return true;
  if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (ip.startsWith('ff')) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  return mapped ? isBlockedIp(mapped[1]) : false;
}

export function assertSafeAuditUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('INVALID_URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('UNSAFE_SCHEME');
  if (url.username || url.password) throw new Error('URL_CREDENTIALS_NOT_ALLOWED');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('UNSAFE_PORT');
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.home.arpa')) {
    throw new Error('PRIVATE_HOSTNAME');
  }
  if (parseIpv4(hostname) || hostname.includes(':')) {
    if (isBlockedIp(hostname)) throw new Error('PRIVATE_ADDRESS');
  }
  url.hash = '';
  return url;
}

export async function resolvePublicAddresses(hostname, fetchImpl = fetch) {
  if (parseIpv4(hostname) || hostname.includes(':')) {
    if (isBlockedIp(hostname)) throw new Error('PRIVATE_ADDRESS');
    return [hostname];
  }
  const endpoint = 'https://cloudflare-dns.com/dns-query';
  const addresses = [];
  for (const type of ['A', 'AAAA']) {
    const query = `${endpoint}?name=${encodeURIComponent(hostname)}&type=${type}`;
    const response = await fetchImpl(query, { headers: { accept: 'application/dns-json' }, redirect: 'error' });
    if (!response.ok) throw new Error('DNS_LOOKUP_FAILED');
    const body = await response.json();
    for (const answer of body.Answer ?? []) {
      if (answer.type !== 1 && answer.type !== 28) continue;
      const value = String(answer.data ?? '').toLowerCase();
      if (isBlockedIp(value)) throw new Error('PRIVATE_DNS_ANSWER');
      addresses.push(value);
    }
  }
  if (addresses.length === 0) throw new Error('DNS_UNRESOLVED');
  return [...new Set(addresses)];
}

async function readBoundedText(response, maxBytes) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared && declared > maxBytes) throw new Error('PAGE_TOO_LARGE');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error('PAGE_TOO_LARGE');
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

export async function fetchPublicHtml(value, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolveHost = options.resolveHost ?? ((hostname) => resolvePublicAddresses(hostname, fetchImpl));
  const limits = { ...DEFAULT_LIMITS, ...(options.limits ?? {}) };
  let current = assertSafeAuditUrl(value);

  for (let redirectCount = 0; redirectCount <= limits.maxRedirects; redirectCount += 1) {
    await resolveHost(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), limits.timeoutMs);
    let response;
    try {
      response = await fetchImpl(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml;q=0.9',
          'user-agent': 'LayerPorter-Page-Audit/0.1 (+https://layerporter.com/)',
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount >= limits.maxRedirects) throw new Error('TOO_MANY_REDIRECTS');
      const location = response.headers.get('location');
      if (!location) throw new Error('REDIRECT_WITHOUT_LOCATION');
      current = assertSafeAuditUrl(new URL(location, current).toString());
      continue;
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new Error('UNSUPPORTED_CONTENT_TYPE');
    const html = await readBoundedText(response, limits.maxBytes);
    return {
      url: current.toString(),
      status: response.status,
      headers: { 'content-type': contentType, 'content-length': response.headers.get('content-length') ?? null },
      html,
      redirectCount,
      limits,
    };
  }
  throw new Error('TOO_MANY_REDIRECTS');
}

export const URL_AUDIT_LIMITS = DEFAULT_LIMITS;
