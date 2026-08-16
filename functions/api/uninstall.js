import {
  ownerTestInfo,
  saveStatEvent,
  statsForDays,
  statsTotal,
  sendTelegram,
  editTelegram,
  uninstallMessage,
  getUninstallSession,
  putUninstallSession,
  sanitizeComment,
} from '../_lib/analytics.js';

const PRODUCTS = new Set(['ic', 'h2f', 'pex', 's2c', 'ds']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHASES = new Set(['open', 'feedback', 'skip', 'partial']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function cleanReasonKeys(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 8);
}

async function sendOrEdit(env, record) {
  const [today, total] = await Promise.all([
    statsForDays(env, record.p, 1),
    statsTotal(env, record.p),
  ]);
  const text = uninstallMessage(record, today, total);
  if (record.telegram_message_id) {
    // Если edit упал — не откатываться к send: это создаёт дубль.
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

  const p = typeof body.p === 'string' ? body.p.trim() : '';
  const sid = typeof body.sid === 'string' ? body.sid.trim() : '';
  const phase = typeof body.phase === 'string' ? body.phase.trim() : '';
  const v = typeof body.v === 'string' ? body.v.trim().slice(0, 40) : '';
  const locale = typeof body.locale === 'string' ? body.locale.trim().slice(0, 20) : '';

  if (!PRODUCTS.has(p)) return json({ ok: false, error: 'unknown_product' }, 400);
  if (!UUID_RE.test(sid)) return json({ ok: false, error: 'bad_sid' }, 400);
  if (!PHASES.has(phase)) return json({ ok: false, error: 'bad_phase' }, 400);

  let record = await getUninstallSession(env, sid);

  if (phase === 'open') {
    if (record) return json({ ok: true, dedup: true });

    const { isTest, country } = ownerTestInfo(request, env);
    record = {
      p,
      sid,
      v,
      locale,
      country,
      is_test: isTest,
      created_at: new Date().toISOString(),
      feedback_status: 'none',
      reason_keys: [],
      comment: '',
      telegram_message_id: null,
    };

    if (!isTest) {
      await saveStatEvent(env, { p, event: 'uninstall', id: sid, ts: Date.now() });
    }

    await putUninstallSession(env, sid, record);

    const messageId = await sendOrEdit(env, { ...record, feedback_status: 'none' }).catch(() => null);
    if (messageId) {
      record.telegram_message_id = messageId;
      await putUninstallSession(env, sid, record);
    }

    return json({ ok: true });
  }

  // Если feedback пришёл раньше, чем open успел записаться (редкий race), создаём
  // сессию здесь и всё равно считаем один uninstall, а не теряем событие.
  if (!record) {
    const { isTest, country } = ownerTestInfo(request, env);
    record = {
      p,
      sid,
      v,
      locale,
      country,
      is_test: isTest,
      created_at: new Date().toISOString(),
      feedback_status: 'none',
      reason_keys: [],
      comment: '',
      telegram_message_id: null,
    };
    if (!isTest) await saveStatEvent(env, { p, event: 'uninstall', id: sid, ts: Date.now() });
  }

  record.reason_keys = cleanReasonKeys(body.reasonKeys);
  record.comment = sanitizeComment(body.comment);
  if (phase === 'feedback') record.feedback_status = 'submitted';
  if (phase === 'skip') record.feedback_status = 'skipped';
  if (phase === 'partial') record.feedback_status = 'partial';
  record.updated_at = new Date().toISOString();

  if (phase === 'feedback' && !record.is_test) {
    await saveStatEvent(env, { p, event: 'uninstall_feedback', id: sid, ts: Date.now() });
  }

  await putUninstallSession(env, sid, record);
  const messageId = await sendOrEdit(env, record).catch(() => null);
  if (messageId && !record.telegram_message_id) {
    record.telegram_message_id = messageId;
    await putUninstallSession(env, sid, record);
  }

  return json({ ok: true });
}
