const API_BASE = 'https://api-sandbox.pinterest.com/v5';

export function sandboxConfigured(env) {
  return Boolean(env.PINTEREST_SANDBOX_TOKEN);
}

export async function pinterestSandboxFetch(env, path, init = {}) {
  if (!env.PINTEREST_SANDBOX_TOKEN) {
    return { response: null, error: { status: 503, code: 'sandbox_token_not_configured' } };
  }

  const headers = new Headers(init.headers || {});
  headers.set('authorization', `Bearer ${env.PINTEREST_SANDBOX_TOKEN}`);
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json');

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    return { response: null, error: { status: 502, code: 'pinterest_network_error' } };
  }

  return { response, error: null };
}

export async function readPinterestJson(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { return { raw: text.slice(0, 1000) }; }
}
