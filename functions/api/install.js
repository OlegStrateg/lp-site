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
import { eavStatsTotal } from '../_lib/eav-stats.js';

const PRODUCTS = new Set(['ic', 'h2f', 'pex', 's2c', 'ds', 'pd', 'eav']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHASES = new Set(['open', 'pinned', 'panel_opened', 'abandoned', 'open_click', 'open_success', 'open_error']);
const ATTR_SOURCES = new Set(['google_organic','yandex_organic','bing_organic','duckduckgo_organic','yahoo_organic','search_organic','paid','referral','direct','unknown']);
const ATTR_CTAS = new Set(['header','hero','final','mobile_sticky','']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
function productLabel(text, p) { return p === 'eav' ? String(text).replaceAll('eav', 'Audio Extractor from Video') : text; }
async function sendOrEdit(env, record) {
  const totalPromise = record.p === 'eav' ? eavStatsTotal(env) : statsTotal(env, record.p);
  const [today, total] = await Promise.all([statsForDays(env, record.p, 1), totalPromise]);
  const text = productLabel(installSessionMessage({ record, today, total }), record.p);
  if (record.telegram_message_id) { await editTelegram(env, record.telegram_message_id, text).catch(() => null); return Number(record.telegram_message_id); }
  const sent = await sendTelegram(env, text); return sent?.message_id ? Number(sent.message_id) : null;
}
async function makeRecord(request, env, { p, sid, v, locale, attribution = null }) {
  const { isTest, country } = ownerTestInfo(request, env);
  const record = { p, sid, v, locale, country, attribution, is_test: isTest, created_at: new Date().toISOString(), pinned: false, panel_opened: false, open_clicked: false, open_error: false, abandoned: false, telegram_message_id: null };
  if (!isTest) {
    await saveStatEvent(env, { p, event: 'install', id: sid, ts: Date.now() });
    await saveStatEvent(env, { p, event: 'welcome_view', id: sid, ts: Date.now() });
    if (attribution) {
      await saveStatEvent(env, { p, event: 'install_landing', id: sid, ts: Date.now(), value: attribution.source });
      if (attribution.organic) await saveStatEvent(env, { p, event: 'install_organic', id: sid, ts: Date.now(), value: attribution.source });
    }
  }
  return record;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }
  const p = typeof body.p === 'string' ? body.p.trim() : '';
  const sid = typeof body.sid === 'string' ? body.sid.trim() : '';
  const phase = typeof body.phase === 'string' ? body.phase.trim() : '';
  const v = typeof body.v === 'string' ? body.v.trim().slice(0, 40) : '';
  const locale = typeof body.locale === 'string' ? body.locale.trim().slice(0, 20) : '';
  let attribution = null;
  if (p === 'pd' && phase === 'open' && body.attribution && typeof body.attribution === 'object' && !Array.isArray(body.attribution)) {
    const source = typeof body.attribution.source === 'string' ? body.attribution.source.trim().slice(0, 32) : '';
    const landingLocale = typeof body.attribution.landing_locale === 'string' ? body.attribution.landing_locale.trim().slice(0, 20) : '';
    const cta = typeof body.attribution.cta === 'string' ? body.attribution.cta.trim().slice(0, 24) : '';
    const ageDaysRaw = Number(body.attribution.age_days);
    if (ATTR_SOURCES.has(source) && ATTR_CTAS.has(cta)) attribution = { source, landing_locale: landingLocale, cta, age_days: Number.isFinite(ageDaysRaw) ? Math.max(0, Math.min(14, Math.floor(ageDaysRaw))) : null, organic: source.endsWith('_organic') };
  }
  if (!PRODUCTS.has(p)) return json({ ok: false, error: 'unknown_product' }, 400);
  if (!UUID_RE.test(sid)) return json({ ok: false, error: 'bad_sid' }, 400);
  if (!PHASES.has(phase)) return json({ ok: false, error: 'bad_phase' }, 400);

  if (phase === 'open') {
    const existing = await getInstallSession(env, sid); if (existing) return json({ ok: true, dedup: true });
    const record = await makeRecord(request, env, { p, sid, v, locale, attribution });
    await putInstallSession(env, sid, record);
    const messageId = await sendOrEdit(env, record).catch(() => null);
    if (messageId) { record.telegram_message_id = messageId; await putInstallSession(env, sid, record); }
    return json({ ok: true });
  }

  let record = await getInstallSession(env, sid);
  if (!record) {
    // A very fast click can beat the welcome-page open beacon. Create the same session here;
    // later phase=open deduplicates on the same sid, so no event is counted twice.
    record = await makeRecord(request, env, { p, sid, v, locale });
  }
  if (phase === 'pinned') record.pinned = true;
  if (phase === 'panel_opened' || phase === 'open_success') record.panel_opened = true;
  if (phase === 'open_click') record.open_clicked = true;
  if (phase === 'open_error') record.open_error = true;
  if (phase === 'abandoned') record.abandoned = true;
  record.updated_at = new Date().toISOString();
  if (!record.is_test) {
    if (phase === 'open_click') await saveStatEvent(env, { p, event: 'welcome_open_click', id: sid, ts: Date.now() });
    if (phase === 'panel_opened' || phase === 'open_success') await saveStatEvent(env, { p, event: 'welcome_open_success', id: sid, ts: Date.now() });
    if (phase === 'open_error') await saveStatEvent(env, { p, event: 'welcome_open_error', id: sid, ts: Date.now() });
  }
  await putInstallSession(env, sid, record);
  const messageId = await sendOrEdit(env, record).catch(() => null);
  if (messageId && !record.telegram_message_id) { record.telegram_message_id = messageId; await putInstallSession(env, sid, record); }
  return json({ ok: true });
}
