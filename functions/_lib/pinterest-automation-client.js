const BASE = {
  sandbox: 'https://api-sandbox.pinterest.com/v5',
  production: 'https://api.pinterest.com/v5',
};

export async function pinterestRequest(account, path, init = {}) {
  if (!account?.token) return { response: null, data: null, error: 'token_missing' };
  const base = BASE[account.environment];
  if (!base) return { response: null, data: null, error: 'invalid_environment' };

  const headers = new Headers(init.headers || {});
  headers.set('authorization', 'Bearer ' + account.token);
  headers.set('accept', 'application/json');
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  let response;
  try {
    response = await fetch(base + path, { ...init, headers });
  } catch {
    return { response: null, data: null, error: 'pinterest_network_error' };
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { raw: text.slice(0, 1000) }; }
  }

  return { response, data, error: null };
}

export function pinterestFailure(data, status) {
  return {
    ok: false,
    error: 'pinterest_api_error',
    pinterest_status: status,
    pinterest_code: data?.code ?? null,
    message: data?.message ?? null,
  };
}
