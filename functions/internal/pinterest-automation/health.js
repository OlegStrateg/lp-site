import { isAdmin, json, listAccounts } from '../../_lib/pinterest-automation-admin.js';
import { getWorkerHeartbeat } from '../../_lib/pinterest-automation-data.js';

export async function onRequestGet({ request, env }) {
  const storageConfigured = Boolean(env.FEEDBACK_KV);
  const authenticated = storageConfigured ? await isAdmin(request, env) : false;
  let accountCount = 0;
  let heartbeat = null;

  if (storageConfigured) {
    heartbeat = await getWorkerHeartbeat(env);
    if (authenticated) accountCount = (await listAccounts(env)).length;
  }

  const heartbeatAge = heartbeat?.finished_at ? Date.now() - Date.parse(heartbeat.finished_at) : null;
  const workerHealthy = Boolean(
    heartbeat &&
    heartbeat.ok !== false &&
    Number.isFinite(heartbeatAge) &&
    heartbeatAge < 15 * 60 * 1000
  );

  return json({
    ok: true,
    service: 'pinterest-automation',
    version: '0.5.0-pin005',
    mode: 'sandbox',
    livePublishing: false,
    productionPinterestConfigured: Boolean(env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET),
    sandboxConfigured: accountCount > 0,
    previewAuthConfigured: storageConfigured,
    previewAuthenticated: authenticated,
    adminAuthConfigured: storageConfigured,
    accountStorage: storageConfigured ? 'cloudflare_kv' : 'not_connected',
    accountCount: authenticated ? accountCount : null,
    workerConfigured: true,
    workerHealthy,
    workerLastRun: heartbeat?.finished_at || null,
  });
}
