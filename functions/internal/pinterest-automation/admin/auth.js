import { isAdmin, json, login, logout } from '../../../_lib/pinterest-automation-admin.js';

export async function onRequestGet({ request, env }) {
  return json({ ok: true, authenticated: await isAdmin(request, env) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return json({ ok: false, error: 'origin_forbidden' }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const result = await login(body?.password, env);
  if (!result.ok) return json({ ok: false, error: result.error }, result.status);

  return json({ ok: true }, 200, { 'set-cookie': result.cookie });
}

export async function onRequestDelete({ request, env }) {
  return json({ ok: true }, 200, { 'set-cookie': await logout(request, env) });
}
