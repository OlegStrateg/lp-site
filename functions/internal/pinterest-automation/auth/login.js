import { createAuthCookie, json, passwordMatches } from '../../../_lib/pinterest-automation-auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.PINTEREST_PREVIEW_PASSWORD) {
    return json({ ok: false, error: 'preview_auth_not_configured' }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const password = typeof body?.password === 'string' ? body.password.slice(0, 512) : '';
  if (!(await passwordMatches(password, env.PINTEREST_PREVIEW_PASSWORD))) {
    return json({ ok: false, error: 'invalid_password' }, 401);
  }

  return json({ ok: true }, 200, { 'set-cookie': await createAuthCookie(env) });
}
