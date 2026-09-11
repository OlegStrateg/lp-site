import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const BLOCKED_V4 = new net.BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]) BLOCKED_V4.addSubnet(network, prefix, 'ipv4');

const BLOCKED_V6 = new net.BlockList();
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
]) BLOCKED_V6.addSubnet(network, prefix, 'ipv6');

function securityError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function bareHostname(value) {
  return value.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
}

export function isBlockedAddress(address) {
  const family = net.isIP(address);
  if (!family) return true;
  if (family === 4) return BLOCKED_V4.check(address, 'ipv4');

  const lower = address.toLowerCase();
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice('::ffff:'.length);
    if (net.isIP(mapped) === 4) return BLOCKED_V4.check(mapped, 'ipv4');
  }
  return BLOCKED_V6.check(address, 'ipv6');
}

export function validateRemoteUrl(input) {
  let url;
  try {
    url = input instanceof URL ? new URL(input.href) : new URL(String(input));
  } catch {
    throw securityError('INVALID_URL', 'invalid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) throw securityError('UNSAFE_SCHEME', 'only http and https URLs are allowed');
  if (url.username || url.password) throw securityError('URL_CREDENTIALS_BLOCKED', 'credentials in URLs are not allowed');

  const hostname = bareHostname(url.hostname);
  if (!hostname) throw securityError('INVALID_HOST', 'URL hostname is required');
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) throw securityError('PRIVATE_HOST_BLOCKED', 'localhost is not allowed');
  if (net.isIP(hostname) && isBlockedAddress(hostname)) throw securityError('PRIVATE_IP_BLOCKED', 'private or non-routable IP is not allowed');

  return url;
}

export function createSafeLookup(lookupFn = dns.lookup) {
  return function safeLookup(hostname, options, callback) {
    lookupFn(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) return callback(error);
      if (!Array.isArray(addresses) || addresses.length === 0) return callback(securityError('DNS_EMPTY', 'hostname did not resolve'));
      if (addresses.some((entry) => isBlockedAddress(entry.address))) {
        return callback(securityError('PRIVATE_DNS_BLOCKED', 'hostname resolved to a private or non-routable IP'));
      }

      const requestedFamily = typeof options === 'number' ? options : options?.family;
      const candidates = requestedFamily === 4 || requestedFamily === 6
        ? addresses.filter((entry) => entry.family === requestedFamily)
        : addresses;
      if (candidates.length === 0) return callback(securityError('DNS_FAMILY_MISMATCH', 'hostname has no address for requested family'));

      if (typeof options === 'object' && options?.all) return callback(null, candidates);
      return callback(null, candidates[0].address, candidates[0].family);
    });
  };
}

export async function requestOnce(url, options = {}) {
  const safeUrl = validateRemoteUrl(url);
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 8000;
  const lookup = options.lookup ?? createSafeLookup();
  const hostname = bareHostname(safeUrl.hostname);
  const transport = safeUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const request = transport.request({
      protocol: safeUrl.protocol,
      hostname,
      port: safeUrl.port || undefined,
      path: `${safeUrl.pathname}${safeUrl.search}`,
      method: 'GET',
      lookup,
      agent: false,
      servername: net.isIP(hostname) ? undefined : hostname,
      headers: {
        'user-agent': 'LayerPorter-Image-Optimizer/0.1 (+https://layerporter.com/)',
        accept: options.accept ?? '*/*',
        'accept-encoding': 'identity',
        connection: 'close',
      },
    }, (response) => {
      const status = response.statusCode ?? 0;
      const headers = response.headers;
      const location = headers.location;

      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume();
        if (!settled) {
          settled = true;
          resolve({ status, headers, body: Buffer.alloc(0), location });
        }
        return;
      }

      const contentLength = Number(headers['content-length'] ?? 0);
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        response.destroy();
        return fail(securityError('RESPONSE_TOO_LARGE', 'response exceeds byte limit'));
      }

      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          response.destroy();
          fail(securityError('RESPONSE_TOO_LARGE', 'response exceeds byte limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', fail);
      response.on('end', () => {
        if (settled) return;
        settled = true;
        resolve({ status, headers, body: Buffer.concat(chunks), location: null });
      });
    });

    request.setTimeout(timeoutMs, () => request.destroy(securityError('REQUEST_TIMEOUT', 'request timed out')));
    request.on('error', fail);
    request.end();
  });
}

export async function secureFetch(input, options = {}) {
  const maxRedirects = Math.max(0, Math.min(options.maxRedirects ?? 3, 5));
  const requestOnceImpl = options.requestOnceImpl ?? requestOnce;
  let current = validateRemoteUrl(input);
  const redirects = [];

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = await requestOnceImpl(current, options);
    if ([301, 302, 303, 307, 308].includes(response.status) && response.location) {
      if (hop >= maxRedirects) throw securityError('TOO_MANY_REDIRECTS', 'redirect limit reached');
      const next = validateRemoteUrl(new URL(response.location, current));
      redirects.push({ from: current.href, to: next.href, status: response.status });
      current = next;
      continue;
    }
    return { ...response, url: current.href, redirects };
  }

  throw securityError('TOO_MANY_REDIRECTS', 'redirect limit reached');
}
