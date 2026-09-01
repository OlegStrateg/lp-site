import { isAuthorized, json } from '../../_lib/pinterest-automation-auth.js';

export async function onRequestGet({ request, env }) {
  const previewAuthConfigured = Boolean(env.PINTEREST_PREVIEW_PASSWORD);
  const sandboxConfigured = Boolean(env.PINTEREST_SANDBOX_TOKEN);

  return json({
    ok: true,
    service: 'pinterest-automation-preview',
    version: '0.1.0-sandbox',
    mode: 'sandbox',
    livePublishing: false,
    productionPinterestConfigured: Boolean(env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET),
    sandboxConfigured,
    previewAuthConfigured,
    previewAuthenticated: previewAuthConfigured ? await isAuthorized(request, env) : false,
    database: 'not_connected',
    worker: 'not_connected',
  });
}
