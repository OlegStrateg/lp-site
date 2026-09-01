const QUEUE_PREFIX = 'pa:queue:';
const CONTENT_PREFIX = 'pa:content:';
const ACCOUNT_PREFIX = 'pa:account:';
const SETTINGS_KEY = 'pa:settings';
const HEARTBEAT_KEY = 'pa:worker:heartbeat';
const MAX_PER_RUN = 10;
const PROCESSING_STALE_MS = 20 * 60 * 1000;

const DEFAULT_SETTINGS = {
  daily_limit: 5,
  production_live: false,
  sandbox_auto_publish: true,
};

function nowIso() {
  return new Date().toISOString();
}

function sameUtcDay(value, now = new Date()) {
  const d = new Date(value || 0);
  return Number.isFinite(d.getTime())
    && d.getUTCFullYear() === now.getUTCFullYear()
    && d.getUTCMonth() === now.getUTCMonth()
    && d.getUTCDate() === now.getUTCDate();
}

async function readJson(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function writeJson(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}

async function listQueue(kv) {
  const raw = await kv.get('pa:queue:index');
  let ids = [];
  try { ids = raw ? JSON.parse(raw) : []; } catch { ids = []; }
  if (!Array.isArray(ids)) ids = [];

  const rows = [];
  for (const id of ids.slice(0,500)) {
    const job = await readJson(kv, QUEUE_PREFIX + id);
    if (job) rows.push(job);
  }
  return rows;
}

async function getSettings(kv) {
  const value = await readJson(kv, SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(value || {}), production_live:false };
}

function baseFor(environment) {
  return environment === 'sandbox'
    ? 'https://api-sandbox.pinterest.com/v5'
    : 'https://api.pinterest.com/v5';
}

async function pinterestRequest(account, path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('authorization','Bearer ' + account.token);
  headers.set('accept','application/json');
  if (init.body) headers.set('content-type','application/json');

  let response;
  try {
    response = await fetch(baseFor(account.environment) + path,{ ...init,headers });
  } catch {
    return { response:null,data:null,error:'network_error' };
  }

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = null; }
  return { response,data,error:null };
}

function retryAt(attempt) {
  const minutes = Math.min(60,5 * Math.pow(2,Math.max(0,attempt - 1)));
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

async function markContent(kv, job, patch) {
  const content = await readJson(kv, CONTENT_PREFIX + job.content_id);
  if (!content) return;
  Object.assign(content,patch,{ updated_at:nowIso() });
  await writeJson(kv,CONTENT_PREFIX + job.content_id,content);
}

async function processJob(kv, job, settings, publishedTodayByAccount) {
  const due = Date.parse(job.next_attempt_at || job.planned_at || '') <= Date.now();
  if (!due) return { processed:false,reason:'not_due' };

  if (job.pin_id || job.status === 'published') {
    if (job.status !== 'published') {
      job.status = 'published';
      job.published_at = job.published_at || nowIso();
      job.updated_at = nowIso();
      await writeJson(kv,QUEUE_PREFIX + job.id,job);
    }
    return { processed:false,reason:'already_published' };
  }

  if (job.status === 'processing') {
    const age = Date.now() - Date.parse(job.processing_started_at || 0);
    if (Number.isFinite(age) && age > PROCESSING_STALE_MS) {
      job.status = 'needs_review';
      job.error_code = 'stale_processing';
      job.error_message = 'Previous publish attempt ended without a confirmed Pinterest response.';
      job.updated_at = nowIso();
      await writeJson(kv,QUEUE_PREFIX + job.id,job);
      await markContent(kv,job,{ status:'error' });
      return { processed:true,reason:'needs_review' };
    }
    return { processed:false,reason:'processing' };
  }

  if (!['queued','retry'].includes(job.status)) return { processed:false,reason:'inactive' };

  const account = await readJson(kv,ACCOUNT_PREFIX + job.account_id);
  if (!account?.token) {
    job.status = 'failed';
    job.error_code = 'account_token_missing';
    job.error_message = 'Pinterest account token is missing.';
    job.updated_at = nowIso();
    await writeJson(kv,QUEUE_PREFIX + job.id,job);
    await markContent(kv,job,{ status:'error' });
    return { processed:true,reason:'failed' };
  }

  if (account.environment === 'production' && !settings.production_live) {
    return { processed:false,reason:'production_locked' };
  }

  if (account.environment === 'sandbox' && settings.sandbox_auto_publish === false) {
    return { processed:false,reason:'sandbox_paused' };
  }

  const publishedToday = publishedTodayByAccount.get(job.account_id) || 0;
  if (publishedToday >= Number(settings.daily_limit || 5)) {
    return { processed:false,reason:'daily_limit' };
  }

  const snapshot = job.snapshot || {};
  if (!job.board_id || !snapshot.title || !snapshot.image_url) {
    job.status = 'failed';
    job.error_code = 'invalid_snapshot';
    job.error_message = 'Queue snapshot is missing board, title or image.';
    job.updated_at = nowIso();
    await writeJson(kv,QUEUE_PREFIX + job.id,job);
    await markContent(kv,job,{ status:'error' });
    return { processed:true,reason:'failed' };
  }

  const content = await readJson(kv,CONTENT_PREFIX + job.content_id);
  if (content?.pin_id) {
    job.pin_id = content.pin_id;
    job.status = 'published';
    job.published_at = content.published_at || nowIso();
    job.updated_at = nowIso();
    await writeJson(kv,QUEUE_PREFIX + job.id,job);
    return { processed:false,reason:'content_already_published' };
  }

  job.status = 'processing';
  job.processing_started_at = nowIso();
  job.attempts = Number(job.attempts || 0) + 1;
  job.updated_at = nowIso();
  await writeJson(kv,QUEUE_PREFIX + job.id,job);

  const payload = {
    board_id:String(job.board_id),
    title:String(snapshot.title).slice(0,100),
    description:String(snapshot.description || '').slice(0,500),
    alt_text:String(snapshot.alt_text || snapshot.title).slice(0,500),
    media_source:{ source_type:'image_url',url:String(snapshot.image_url) },
  };
  if (snapshot.destination_url) payload.link = String(snapshot.destination_url);

  const result = await pinterestRequest(account,'/pins',{
    method:'POST',
    body:JSON.stringify(payload),
  });

  if (result.error) {
    job.status = 'needs_review';
    job.error_code = 'network_uncertain';
    job.error_message = 'Network result is uncertain; automatic retry is disabled to prevent duplicate Pins.';
    job.updated_at = nowIso();
    await writeJson(kv,QUEUE_PREFIX + job.id,job);
    await markContent(kv,job,{ status:'error' });
    return { processed:true,reason:'needs_review' };
  }

  if (result.response.ok) {
    const pinId = String(result.data?.id || '');
    job.pin_id = pinId || null;
    job.status = pinId ? 'published' : 'needs_review';
    job.published_at = pinId ? nowIso() : null;
    job.error_code = pinId ? null : 'missing_pin_id';
    job.error_message = pinId ? null : 'Pinterest returned success without a Pin ID.';
    job.updated_at = nowIso();

    if (pinId) {
      const verify = await pinterestRequest(account,`/pins/${pinId}?pin_metrics=true`);
      job.readback_verified = Boolean(
        verify.response?.ok &&
        String(verify.data?.id || '') === pinId
      );
      publishedTodayByAccount.set(job.account_id,publishedToday + 1);
      await markContent(kv,job,{
        status:'published',
        pin_id:pinId,
        published_at:job.published_at,
      });
    } else {
      await markContent(kv,job,{ status:'error' });
    }

    await writeJson(kv,QUEUE_PREFIX + job.id,job);
    return { processed:true,reason:pinId?'published':'needs_review' };
  }

  const status = result.response.status;
  const message = result.data?.message || `Pinterest HTTP ${status}`;

  if (status === 429 && job.attempts < Number(job.max_attempts || 3)) {
    job.status = 'retry';
    job.next_attempt_at = retryAt(job.attempts);
    job.error_code = 'rate_limited';
    job.error_message = message;
    job.updated_at = nowIso();
    await writeJson(kv,QUEUE_PREFIX + job.id,job);
    return { processed:true,reason:'retry' };
  }

  if (status >= 500) {
    job.status = 'needs_review';
    job.error_code = 'server_uncertain';
    job.error_message = 'Pinterest returned a server error after Create Pin; automatic retry is disabled to prevent duplicates.';
    job.updated_at = nowIso();
    await writeJson(kv,QUEUE_PREFIX + job.id,job);
    await markContent(kv,job,{ status:'error' });
    return { processed:true,reason:'needs_review' };
  }

  job.status = 'failed';
  job.error_code = `pinterest_${status}`;
  job.error_message = message;
  job.updated_at = nowIso();
  await writeJson(kv,QUEUE_PREFIX + job.id,job);
  await markContent(kv,job,{ status:'error' });
  return { processed:true,reason:'failed' };
}

export default {
  async scheduled(event, env, ctx) {
    const kv = env.FEEDBACK_KV;
    const startedAt = nowIso();
    const heartbeat = {
      ok:true,
      started_at:startedAt,
      finished_at:null,
      processed:0,
      published:0,
      retry:0,
      failed:0,
      needs_review:0,
      skipped:0,
      cron:event.cron || null,
    };
    await writeJson(kv,HEARTBEAT_KEY,heartbeat);

    try {
      const [settings,jobs] = await Promise.all([getSettings(kv),listQueue(kv)]);
      const publishedTodayByAccount = new Map();

      for (const job of jobs) {
        if (job.status === 'published' && sameUtcDay(job.published_at)) {
          publishedTodayByAccount.set(
            job.account_id,
            (publishedTodayByAccount.get(job.account_id) || 0) + 1
          );
        }
      }

      const candidates = jobs
        .filter(job => ['queued','retry','processing'].includes(job.status))
        .sort((a,b) => String(a.next_attempt_at || a.planned_at || '').localeCompare(String(b.next_attempt_at || b.planned_at || '')))
        .slice(0,MAX_PER_RUN);

      for (const job of candidates) {
        const result = await processJob(kv,job,settings,publishedTodayByAccount);
        if (!result.processed) {
          heartbeat.skipped += 1;
          continue;
        }
        heartbeat.processed += 1;
        if (['published','retry','failed','needs_review'].includes(result.reason)) {
          heartbeat[result.reason] += 1;
        }
      }

      heartbeat.finished_at = nowIso();
      await writeJson(kv,HEARTBEAT_KEY,heartbeat);
    } catch {
      heartbeat.ok = false;
      heartbeat.finished_at = nowIso();
      heartbeat.failed += 1;
      await writeJson(kv,HEARTBEAT_KEY,heartbeat);
    }
  },

  async fetch() {
    return new Response('Not found',{ status:404 });
  },
};
