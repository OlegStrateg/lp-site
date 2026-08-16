import {
  ownerTestInfo,
  saveStatEvent,
  markSeen,
  statsForDays,
  sendTelegram,
  installMessage,
  isOwnerTestIid,
  rememberOwnerTestIid,
} from '../_lib/analytics.js';

const PRODUCTS = new Set(['ic', 'h2f', 'pex', 's2c', 'ds']);
const EVENTS = new Set([
  'install',
  'onboarding_viewed',
  'ui_opened',
  'action_started',
  'action_completed',
  'output_used',
  'error',
  'feedback',
  'uninstall_reason',
  'action_step',
  'ui_abandoned',
  'nudge_shown',
  'nudge_clicked',
  'nudge_dismissed',
  'nudge_eligible',
  // Image Converter live funnel
  'first_conversion_completed',
  'rating',
  'share',
  'pin_prompt_shown',
  'pin_prompt_dismissed',
  'pin_completed',
  'welcome_view',
  'welcome_open_click',
  'welcome_open_success',
  'welcome_open_error',
]);

const STATS_EVENTS = new Set([
  'install',
  'welcome_view',
  'welcome_open_click',
  'welcome_open_success',
  'welcome_open_error',
]);

const FORBIDDEN_PROP_KEYS = new Set([
  'url', 'href', 'text', 'page', 'pageurl', 'content', 'html', 'email', 'name', 'title_full',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH = 50;

function originHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const headers = {
    'content-type': 'application/json',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
  if (origin.startsWith('chrome-extension://')) headers['access-control-allow-origin'] = origin;
  return headers;
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: originHeaders(request) });
}

function sanitizeProps(props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return {};
  const clean = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_PROP_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === 'object' && value !== null) continue;
    if (typeof value === 'string' && value.length > 500) continue;
    clean[key] = value;
  }
  return clean;
}

function validate(raw) {
  if (!raw || typeof raw !== 'object') return 'bad_envelope';
  if (!PRODUCTS.has(raw.p)) return 'unknown_product';
  if (!EVENTS.has(raw.e)) return 'unknown_event';
  if (!UUID_RE.test(String(raw.iid || ''))) return 'bad_iid';
  if (!Number.isFinite(raw.ts)) return 'bad_ts';
  return null;
}

async function processEvent(request, env, raw) {
  const owner = ownerTestInfo(request, env);
  let isTest = owner.isTest;
  const country = owner.country;

  // Первый запрос с IP владельца закрепляет iid этой установки как тестовый.
  // После этого welcome/usage события этой установки остаются тестовыми
  // даже при смене сети или VPN. Uninstall без iid по-прежнему опирается на IP.
  if (isTest) await rememberOwnerTestIid(env, raw.iid);
  else isTest = await isOwnerTestIid(env, raw.iid);

  const props = sanitizeProps(raw.props);

  if (env?.LP_ANALYTICS?.writeDataPoint) {
    const step = typeof props.step === 'string' ? props.step : '';
    const dur = typeof props.dur === 'number' ? props.dur : 0;
    env.LP_ANALYTICS.writeDataPoint({
      blobs: [raw.p, raw.e, raw.iid, raw.l || '', raw.v || '', step, isTest ? 'test' : 'prod'],
      doubles: [raw.ts, dur],
      indexes: [raw.p],
    });
  }

  if (STATS_EVENTS.has(raw.e) && !isTest) {
    await saveStatEvent(env, { p: raw.p, event: raw.e, id: raw.iid, ts: raw.ts });
  }

  if (raw.e === 'install') {
    const seenKey = `${isTest ? 'test:' : ''}${raw.p}:install:${raw.iid}`;
    if (await markSeen(env, seenKey, 30 * 24 * 3600)) {
      const [today, total] = await Promise.all([
        statsForDays(env, raw.p, 1),
        statsForDays(env, raw.p, 90),
      ]);
      await sendTelegram(env, installMessage({
        p: raw.p,
        v: raw.v || '',
        locale: raw.l || '',
        country,
        isTest,
        today,
        total,
      }));
    }
  }
}

export async function onRequestOptions({ request }) {
  return json(request, { ok: true }, 204);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); }
  catch { return json(request, { ok: false, error: 'bad_json' }, 400); }

  const events = Array.isArray(body?.events) ? body.events : [body];
  if (!events.length || events.length > MAX_BATCH) return json(request, { ok: false, error: 'bad_batch' }, 400);

  for (const raw of events) {
    const error = validate(raw);
    if (error) return json(request, { ok: false, error }, 400);
  }

  // Обработка высокоценных событий не откладывается: install должен успеть
  // попасть в Telegram даже если MV3 service worker сразу уснёт после установки.
  const job = Promise.all(events.map((raw) => processEvent(request, env, raw)));
  if (typeof context.waitUntil === 'function') context.waitUntil(job.catch(() => {}));
  else await job;

  return json(request, { ok: true, count: events.length });
}
