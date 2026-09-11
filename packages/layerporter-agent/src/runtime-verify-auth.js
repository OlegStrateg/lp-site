const encoder = new TextEncoder();

async function digest(value) {
  const bytes = encoder.encode(String(value || ''));
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function isRuntimeVerificationRequestAllowed(request, env) {
  if (env?.LAYERPORTER_AGENT_VERIFY_HTTP !== 'true') return false;
  if (env?.LAYERPORTER_AGENT_WRITE_MODE !== 'dry-run') return false;
  const expected = env?.LAYERPORTER_AGENT_VERIFY_TOKEN;
  if (!expected) return false;
  if (request.method !== 'POST') return false;
  const url = new URL(request.url);
  if (url.pathname !== '/__lp097/verify-runtime') return false;
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return false;
  const supplied = authorization.slice(7);
  const [expectedDigest, suppliedDigest] = await Promise.all([digest(expected), digest(supplied)]);
  return equalBytes(expectedDigest, suppliedDigest);
}
