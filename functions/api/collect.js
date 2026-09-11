import {
  ownerTestInfo,
  saveStatEvent,
  markSeen,
  statsForDays,
  statsTotal,
  sendTelegram,
  installMessage,
  isOwnerTestIid,
  rememberOwnerTestIid,
  dayKey,
} from '../_lib/analytics.js';

const PRODUCTS = new Set(['ic', 'h2f', 'pex', 's2c', 'ds', 'pd', 'site']);

const EXTENSION_EVENTS = new Set([
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

// Existing website event names already emitted by BaseLayout, Home and tool widgets.
// The allow-list is intentionally explicit: unknown client events are rejected rather
// than silently creating an unbounded analytics schema.
const SITE_EVENTS = new Set([
  'page_view',
  'path_card_click',
  'tool_view',
  'upload_start',
  'convert_success',
  'convert_error',
  'retry_click',
  'download_click',
  'cross_sell_click',
  'photopea_open_clicked',
  'convert_another_clicked',
  'extension_bridge_clicked',
  'copy_tags_click',
  'check_success',
  'check_error',
  'universal_drop',
  'universal_route_click',
  'extension_cta_click',
  'extension_store_click',
]);

const STATS_EVENTS = new Set([
  'install',
  'welcome_view',
  'welcome_open_click',
  'welcome_open_success',
  'welcome_open_error',
]);

const FORBIDDEN_PROP_KEYS = new Set([
  'url', 'href', 'text', 'page', 'pageurl', 'path', 'content', 'html', 'email', 'name', 'title_full',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH = 50;
const SITE_STATS_TTL = 180 * 24 * 3600;
const SITE_STORE_PRODUCTS = new Set(['picture_converter', 'pinterest_downloader']);

function originHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const headers = {
    'content-type': 'application/json',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
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
    if (!/^[a-z0-9_]{1,40}$/i.test(key)) continue;
    if (typeof value === 'object' && value !== null) continue;
    if (typeof value === 'string' && value.length > 120) continue;
    if (!['string', 'number', 'boolean'].includes(typeof value)) continue;
    clean[key] = value;
  }
  return clean;
}

function safeSiteRoute(value) {
  const route = String(value || '');
  if (route === '/') return '/';
  if (route === '/other/') return '/other/';
  const locale = '[a-z]{2,3}(?:-[a-z0-9]{2,4})?';
  const page = '(?:extensions|convert(?:/[a-z0-9-]+)?|tools(?:/[a-z0-9-]+)?|picture-converter|pinterest-downloader|formats(?:/[a-z0-9-]+)?|guides(?:/[a-z0-9-]+)?|about|privacy|terms|feedback|uninstall)';
  const knownRoute = new RegExp(`^/(?:${locale}/)?${page}/$`, 'i');
  const localeHome = new RegExp(`^/${locale}/$`, 'i');
  if (knownRoute.test(route) || localeHome.test(route)) return route.toLowerCase();
  return '/other/';
}

function safeSiteStoreProduct(event, props) {
  if (event !== 'extension_store_click') return '';
  const product = typeof props?.product === 'string' ? props.product : '';
  return SITE_STORE_PRODUCTS.has(product) ? product : '';
}

function validate(raw) {
  if (!raw || typeof raw !== 'object') return 'bad_envelope';
  if (!PRODUCTS.has(raw.p)) return 'unknown_product';
  const eventSet = raw.p === 'site' ? SITE_EVENTS : EXTENSION_EVENTS;
  if (!eventSet.has(raw.e)) return 'unknown_event';
  if (!UUID_RE.test(String(raw.iid || ''))) return 'bad_iid';
  if (!Number.isFinite(raw.ts)) return 'bad_ts';
  return null;
}

async function saveSiteEvent(env, raw, props) {
  if (!env?.FEEDBACK_KV) return;
  const route = safeSiteRoute(props.route);
  const date = dayKey(raw.ts, env);
  const routeKey = encodeURIComponent(route);
  const ts = Math.max(0, Math.trunc(raw.ts));
  const storeProduct = safeSiteStoreProduct(raw.e, props);
  const productSuffix = storeProduct ? `:${storeProduct}` : '';
  const key = `site:${date}:${raw.e}:${routeKey}:${raw.iid}:${ts}${productSuffix}`;
  await env.FEEDBACK_KV.put(key, '1', { expirationTtl: SITE_STATS_TTL });
}

async function listAllKeys(env, prefix) {
  if (!env?.FEEDBACK_KV) return [];
  let cursor;
  const keys = [];
  do {
    const page = await env.FEEDBACK_KV.list({ prefix, cursor, limit: 1000 });
    keys.push(...(page.keys || []));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

async function siteStatsForDays(env, days = 7) {
  const bounded = Math.max(1, Math.min(90, Number(days) || 7));
  const events = {};
  const pages = {};
  const pageInstances = new Set();
  const storeClicksByProduct = { picture_converter: 0, pinterest_downloader: 0, unknown: 0 };
  const now = Date.now();

  for (let i = 0; i < bounded; i += 1) {
    const date = dayKey(now - i * 86_400_000, env);
    const keys = await listAllKeys(env, `site:${date}:`);
    for (const { name } of keys) {
      const parts = name.split(':');
      const event = parts[2] || '';
      const route = decodeURIComponent(parts[3] || '%2Fother%2F');
      const iid = parts[4] || '';
      const storeProduct = parts[6] || '';
      events[event] = (events[event] || 0) + 1;
      if (iid) pageInstances.add(iid);
      if (!pages[route]) pages[route] = { page_view: 0, tool_view: 0, convert_success: 0, extension_store_click: 0 };
      if (Object.prototype.hasOwnProperty.call(pages[route], event)) pages[route][event] += 1;
      if (event === 'extension_store_click') {
        const key = SITE_STORE_PRODUCTS.has(storeProduct) ? storeProduct : 'unknown';
        storeClicksByProduct[key] += 1;
      }
    }
  }

  const topPages = Object.entries(pages)
    .sort((a, b) => (b[1].page_view || 0) - (a[1].page_view || 0))
    .slice(0, 50)
    .map(([route, counts]) => ({ route, ...counts }));

  return {
    days: bounded,
    page_instances: pageInstances.size,
    events,
    pages: topPages,
    extension_store_click_by_product: storeClicksByProduct,
  };
}

async function processEvent(request, env, raw) {
  const owner = ownerTestInfo(request, env);
  let isTest = owner.isTest;
  const country = owner.country;

  // Extension installation ids stay test-marked across network changes. Site page ids
  // are intentionally ephemeral and are not persisted as owner identifiers.
  if (raw.p !== 'site') {
    if (isTest) await rememberOwnerTestIid(env, raw.iid);
    else isTest = await isOwnerTestIid(env, raw.iid);
  }

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

  if (raw.p === 'site') {
    if (!isTest) await saveSiteEvent(env, raw, props);
    return;
  }

  if (STATS_EVENTS.has(raw.e) && !isTest) {
    await saveStatEvent(env, { p: raw.p, event: raw.e, id: raw.iid, ts: raw.ts });
  }

  if (raw.e === 'install') {
    const seenKey = `${isTest ? 'test:' : ''}${raw.p}:install:${raw.iid}`;
    if (await markSeen(env, seenKey, 30 * 24 * 3600)) {
      const [today, total] = await Promise.all([
        statsForDays(env, raw.p, 1),
        statsTotal(env, raw.p),
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

// Owner-only lightweight readout for the first-party website funnel.
// It reuses the same IP allow-list already protecting /api/telegram stats.
export async function onRequestGet(context) {
  const { request, env } = context;
  const { isTest } = ownerTestInfo(request, env);
  if (!isTest) return json(request, { ok: false, error: 'forbidden' }, 403);
  const url = new URL(request.url);
  if (!url.searchParams.has('stats')) return json(request, { ok: false, error: 'not_found' }, 404);
  const stats = await siteStatsForDays(env, url.searchParams.get('stats') || 7);
  return json(request, { ok: true, product: 'site', ...stats });
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

  // High-value extension events still use the existing waitUntil path. Site events
  // share the same fire-and-forget contract and can never block page behavior.
  const job = Promise.all(events.map((raw) => processEvent(request, env, raw)));
  if (typeof context.waitUntil === 'function') context.waitUntil(job.catch(() => {}));
  else await job;

  return json(request, { ok: true, count: events.length });
}
