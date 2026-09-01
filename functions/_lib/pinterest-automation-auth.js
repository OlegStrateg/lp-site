const ROOT = '/internal/pinterest-automation';
const AUTH_COOKIE = 'pa_preview_auth';
const AUTH_MAX_AGE = 7 * 24 * 60 * 60;

function parseCookies(request) {
  const raw = request.headers.get('cookie') || '';
  const out = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function base64url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64url(new Uint8Array(sig));
}

async function digest(value) {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return new Uint8Array(result);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function passwordMatches(input, expected) {
  if (!expected || typeof input !== 'string') return false;
  const [a, b] = await Promise.all([digest(input), digest(expected)]);
  return constantTimeEqual(a, b);
}

export async function createAuthCookie(env) {
  if (!env.PINTEREST_PREVIEW_PASSWORD) throw new Error('preview_auth_not_configured');
  const expires = Math.floor(Date.now() / 1000) + AUTH_MAX_AGE;
  const payload = String(expires);
  const signature = await hmac(env.PINTEREST_PREVIEW_PASSWORD, payload);
  return `${AUTH_COOKIE}=${payload}.${signature}; Path=${ROOT}; Max-Age=${AUTH_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearAuthCookie() {
  return `${AUTH_COOKIE}=; Path=${ROOT}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function isAuthorized(request, env) {
  if (!env.PINTEREST_PREVIEW_PASSWORD) return false;
  const token = parseCookies(request)[AUTH_COOKIE];
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const expires = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expiresNum = Number(expires);
  if (!Number.isFinite(expiresNum) || expiresNum < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(env.PINTEREST_PREVIEW_PASSWORD, expires);
  const [a, b] = await Promise.all([digest(signature), digest(expected)]);
  return constantTimeEqual(a, b);
}

export async function requireAuthorized(request, env) {
  if (!env.PINTEREST_PREVIEW_PASSWORD) {
    return json({ ok: false, error: 'preview_auth_not_configured' }, 503);
  }
  if (!(await isAuthorized(request, env))) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  return null;
}

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
      ...extraHeaders,
    },
  });
}
