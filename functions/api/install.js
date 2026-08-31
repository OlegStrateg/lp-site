import {
  ownerTestInfo,
  saveStatEvent,
  statsForDays,
  statsTotal,
  sendTelegram,
  editTelegram,
  getInstallSession,
  putInstallSession,
  installSessionMessage,
} from '../_lib/analytics.js';

const PRODUCTS = new Set(['ic', 'h2f', 'pex', 's2c', 'ds', 'pd']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHASES = new Set(['open', 'pinned', 'panel_opened', 'abandoned']);
const ATTR_SOURCES = new Set(['google_organic','yandex_organic','bing_organic','duckduckgo_organic','yahoo_organic','search_organic','paid','referral','direct','unknown']);
const ATTR_CTAS = new Set(['header','hero','final','mobile_sticky','']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function sendOrEdit(env, record) {
  const [today, total] = await Promise.all([
    statsForDays(env, record.p, 1),
    statsTotal(env, record.p),
  ]);
  const text = installSessionMessage({ record, today, total });
  if (record.telegram_message_id) {
    await editTelegram(env, record.telegram_message_id, text).catch(() => null);
    return Number(record.telegram_message_id);
  }
  const sent = await sendTelegram(env, text);
  return sent?.message_id ? Number(sent.message_id) : null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const p      = typeof body.p      === 'string' ? body.p.trim()             : '';
  const sid    = typeof body.sid    === 'string' ? body.sid.trim()           : '';
  const phase  = typeof body.phase  === 'string' ? body.phase.trim()         : '';
  const v      = typeof body.v      === 'string' ? body.v.trim().slice(0, 40): '';
  const locale = typeof body.locale === 'string' ? body.locale.trim().slice(0, 20) : '';
  let attribution = null;
  if (p === 'pd' && phase === 'open' && body.attribution && typeof body.attribution === 'object' && !Array.isArray(body.attribution)) {
    const source = typeof body.attribution.source === 'string' ? body.attribution.source.trim().slice(0, 32) : '';
    const landingLocale = typeof body.attribution.landing_locale === 'string' ? body.attribution.landing_locale.trim().slice(0, 20) : '';
    const cta = typeof body.attribution.cta === 'string' ? body.attribution.cta.trim().slice(0, 24) : '';
    const ageDaysRaw = Number(body.attribution.age_days);
    if (ATTR_SOURCES.has(source) && ATTR_CTAS.has(cta)) {
      attribution = {
        source,
        landing_locale: landingLocale,
        cta,
        age_days: Number.isFinite(ageDaysRaw) ? Math.max(0, Math.min(14, Math.floor(ageDaysRaw))) : null,
        organic: source.endsWith('_organic'),
      };
    }
  }


  if (!PRODUCTS.has(p))   return json({ ok: false, error: 'unknown_product' }, 400);
  if (!UUID_RE.test(sid)) return json({ ok: false, error: 'bad_sid' }, 400);
  if (!PHASES.has(phase)) return json({ ok: false, error: 'bad_phase' }, 400);

  // --- phase: open — первый визит на welcome-страницу = факт установки ---
  if (phase === 'open') {
    const existing = await getInstallSession(env, sid);
    if (existing) return json({ ok: true, dedup: true });

    const { isTest, country } = ownerTestInfo(request, env);
    const record = {
      p, sid, v, locale, country,
      attribution,
      is_test: isTest,
      created_at: new Date().toISOString(),
      pinned: false,
      panel_opened: false,
      abandoned: false,
      telegram_message_id: null,
    };

    if (!isTest) {
      await saveStatEvent(env, { p, event: 'install', id: sid, ts: Date.now() });
      if (attribution) {
        await saveStatEvent(env, { p, event: 'install_landing', id: sid, ts: Date.now(), value: attribution.source });
        if (attribution.organic) {
          await saveStatEvent(env, { p, event: 'install_organic', id: sid, ts: Date.now(), value: attribution.source });
        }
      }
    }

    await putInstallSession(env, sid, record);

    const messageId = await sendOrEdit(env, record).catch(() => null);
    if (messageId) {
      record.telegram_message_id = messageId;
      await putInstallSession(env, sid, record);
    }

    return json({ ok: true });
  }

  // --- последующие фазы: pinned / panel_opened / abandoned ---
  let record = await getInstallSession(env, sid);
  if (!record) {
    // сессия не найдена (очень редкий edge case — KV replication lag)
    return json({ ok: false, error: 'session_not_found' }, 404);
  }

  if (phase === 'pinned')       record.pinned       = true;
  if (phase === 'panel_opened') record.panel_opened = true;
  if (phase === 'abandoned')    record.abandoned    = true;
  record.updated_at = new Date().toISOString();

  await putInstallSession(env, sid, record);
  const messageId = await sendOrEdit(env, record).catch(() => null);
  if (messageId && !record.telegram_message_id) {
    record.telegram_message_id = messageId;
    await putInstallSession(env, sid, record);
  }

  return json({ ok: true });
}
