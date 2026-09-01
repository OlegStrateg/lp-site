import { isAuthorized, json } from '../../../_lib/pinterest-automation-auth.js';

export async function onRequestGet({ request, env }) {
  return json({
    ok: true,
    configured: Boolean(env.PINTEREST_PREVIEW_PASSWORD),
    authenticated: await isAuthorized(request, env),
  });
}
