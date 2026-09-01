import { isAdmin, json, listAccounts } from '../../_lib/pinterest-automation-admin.js';

export async function onRequestGet({ request, env }) {
  const storageConfigured = Boolean(env.FEEDBACK_KV);
  const authenticated = storageConfigured ? await isAdmin(request, env) : false;
  let accountCount = 0;

  if (storageConfigured && authenticated) {
    accountCount = (await listAccounts(env)).length;
  }

  return json({
    ok: true,
    service: 'pinterest-automation-preview',
    version: '0.2.0-accounts',
    mode: 'sandbox',
    livePublishing: false,
    productionPinterestConfigured: Boolean(env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET),
    sandboxConfigured: accountCount > 0,
    previewAuthConfigured: storageConfigured,
    previewAuthenticated: authenticated,
    adminAuthConfigured: storageConfigured,
    accountStorage: storageConfigured ? 'cloudflare_kv' : 'not_connected',
    accountCount: authenticated ? accountCount : null,
    worker: 'not_connected',
  });
}
