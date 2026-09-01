const ROOT = '/internal/pinterest-automation';
const SESSION_COOKIE = 'pa_admin_session';
const SESSION_TTL = 7 * 24 * 60 * 60;
const ADMIN_PASSWORD_SHA256 = '0e834b33e19cc584f72ebf59fe3f257dcc36dc645a52b977655e113836ca65a4';
const ACCOUNT_PREFIX = 'pa:account:';
const ACCOUNT_INDEX = 'pa:accounts:index';
const SESSION_PREFIX = 'pa:session:';

function store(env) {
  return env.FEEDBACK_KV || null;
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

function parseCookies(request) {
  const raw = request.headers.get('cookie') || '';
  const result = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    result[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return result;
}

async function sha256Hex(value) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function randomId(bytes = 24) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function login(password, env) {
  const kv = store(env);
  if (!kv) return { ok: false, status: 503, error: 'storage_not_configured' };

  const actual = await sha256Hex(password);
  if (actual !== ADMIN_PASSWORD_SHA256) return { ok: false, status: 401, error: 'invalid_password' };

  const sessionId = randomId(32);
  await kv.put(
    SESSION_PREFIX + sessionId,
    JSON.stringify({ created_at: new Date().toISOString() }),
    { expirationTtl: SESSION_TTL }
  );

  return {
    ok: true,
    cookie: `${SESSION_COOKIE}=${sessionId}; Path=${ROOT}; Max-Age=${SESSION_TTL}; HttpOnly; Secure; SameSite=Lax`,
  };
}

export async function logout(request, env) {
  const kv = store(env);
  const sessionId = parseCookies(request)[SESSION_COOKIE];
  if (kv && sessionId) await kv.delete(SESSION_PREFIX + sessionId);
  return `${SESSION_COOKIE}=; Path=${ROOT}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function isAdmin(request, env) {
  const kv = store(env);
  if (!kv) return false;
  const sessionId = parseCookies(request)[SESSION_COOKIE];
  if (!sessionId || !/^[A-Za-z0-9_-]{20,100}$/.test(sessionId)) return false;
  return Boolean(await kv.get(SESSION_PREFIX + sessionId));
}

export async function requireAdmin(request, env) {
  if (!store(env)) return json({ ok: false, error: 'storage_not_configured' }, 503);

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const expected = new URL(request.url).origin;
    if (!origin || origin !== expected) return json({ ok: false, error: 'origin_forbidden' }, 403);
  }

  if (!(await isAdmin(request, env))) return json({ ok: false, error: 'unauthorized' }, 401);
  return null;
}

async function readIndex(env) {
  const kv = store(env);
  const raw = await kv.get(ACCOUNT_INDEX);
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function listAccounts(env) {
  const kv = store(env);
  const ids = await readIndex(env);
  const rows = [];
  for (const id of ids) {
    const raw = await kv.get(ACCOUNT_PREFIX + id);
    if (!raw) continue;
    try { rows.push(JSON.parse(raw)); } catch {}
  }
  return rows;
}

export async function getAccount(env, id) {
  if (!/^acct_[A-Za-z0-9_-]{8,80}$/.test(id || '')) return null;
  const raw = await store(env).get(ACCOUNT_PREFIX + id);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function saveAccount(env, account) {
  const kv = store(env);
  await kv.put(ACCOUNT_PREFIX + account.id, JSON.stringify(account));
  const ids = await readIndex(env);
  if (!ids.includes(account.id)) {
    ids.push(account.id);
    await kv.put(ACCOUNT_INDEX, JSON.stringify(ids));
  }
}

export async function deleteAccount(env, id) {
  const kv = store(env);
  await kv.delete(ACCOUNT_PREFIX + id);
  const ids = (await readIndex(env)).filter(x => x !== id);
  await kv.put(ACCOUNT_INDEX, JSON.stringify(ids));
}

export function makeAccountId() {
  return 'acct_' + randomId(12);
}

export function publicAccount(account) {
  return {
    id: account.id,
    label: account.label,
    username: account.username || null,
    account_type: account.account_type || null,
    environment: account.environment,
    connected_at: account.connected_at,
    checked_at: account.checked_at,
    board_count: Number.isFinite(account.board_count) ? account.board_count : null,
    status: account.status || 'connected',
    token_masked: account.token ? '••••••••' + account.token.slice(-4) : null,
  };
}
