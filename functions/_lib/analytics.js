const PRODUCT_NAMES = {
  ic: 'Image Converter',
  h2f: 'HTML to Figma',
  pex: 'PSD Export',
  s2c: 'Screenshot to Code',
  ds: 'Document Summarizer',
};

const REASON_RU = {
  capture: 'Некорректно захватывает страницу',
  'missing-feature': 'Не хватило нужной функции',
  'slow-crash': 'Слишком медленно или произошёл сбой',
  'found-alternative': 'Нашёл более подходящий вариант',
  'unsure-how': 'Не понял, как пользоваться',
  'trying-out': 'Просто тестировал',
  privacy: 'Сомнения по приватности или разрешениям',
  other: 'Другая причина',
};

const STATS_TTL = 180 * 24 * 3600;
const SESSION_TTL = 90 * 24 * 3600;

export function productName(code) {
  return PRODUCT_NAMES[code] || code || 'Неизвестный продукт';
}

export function ownerTestInfo(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  const configured = String(env?.OWNER_TEST_IPS || env?.OWNER_TEST_IP || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return {
    isTest: !!ip && configured.includes(ip),
    country: request.cf?.country || '',
  };
}

export async function isOwnerTestIid(env, iid) {
  if (!env?.FEEDBACK_KV || !iid) return false;
  return (await env.FEEDBACK_KV.get(`owner-test-iid:${iid}`)) === '1';
}

export async function rememberOwnerTestIid(env, iid) {
  if (!env?.FEEDBACK_KV || !iid) return;
  await env.FEEDBACK_KV.put(`owner-test-iid:${iid}`, '1', { expirationTtl: 365 * 24 * 3600 });
}

function offsetMinutes(env) {
  const raw = Number(env?.OWNER_TZ_OFFSET_MINUTES ?? 180);
  return Number.isFinite(raw) ? Math.max(-720, Math.min(840, raw)) : 180;
}

export function dayKey(ts, env) {
  return new Date(ts + offsetMinutes(env) * 60_000).toISOString().slice(0, 10);
}

function daysBackKeys(days, env, now = Date.now()) {
  const out = [];
  for (let i = 0; i < days; i += 1) out.push(dayKey(now - i * 86_400_000, env));
  return out;
}

export async function saveStatEvent(env, { p, event, id, ts = Date.now(), value = '' }) {
  if (!env?.FEEDBACK_KV || !p || !event || !id) return;
  const date = dayKey(ts, env);
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || crypto.randomUUID();
  const key = `stats:${p}:${date}:${event}:${safeId}`;
  await env.FEEDBACK_KV.put(key, String(value || '1').slice(0, 500), { expirationTtl: STATS_TTL });
}

export async function markSeen(env, key, ttl = 7 * 24 * 3600) {
  if (!env?.FEEDBACK_KV) return true;
  const full = `seen:${key}`;
  const exists = await env.FEEDBACK_KV.get(full);
  if (exists) return false;
  await env.FEEDBACK_KV.put(full, '1', { expirationTtl: ttl });
  return true;
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

export async function statsForDays(env, p, days = 7) {
  const bounded = Math.max(1, Math.min(90, Number(days) || 7));
  const counts = {
    install: 0,
    uninstall: 0,
    uninstall_feedback: 0,
    welcome_view: 0,
    welcome_open_click: 0,
    welcome_open_success: 0,
    welcome_open_error: 0,
  };

  for (const date of daysBackKeys(bounded, env)) {
    const keys = await listAllKeys(env, `stats:${p}:${date}:`);
    for (const { name } of keys) {
      const parts = name.split(':');
      const event = parts[3] || '';
      if (Object.prototype.hasOwnProperty.call(counts, event)) counts[event] += 1;
    }
  }
  return { days: bounded, ...counts };
}

export function formatStats(stats) {
  const notClicked = Math.max(0, stats.welcome_view - stats.welcome_open_click);
  const clickRate = stats.welcome_view > 0
    ? Math.round((stats.welcome_open_click / stats.welcome_view) * 1000) / 10
    : 0;
  const successRate = stats.welcome_open_click > 0
    ? Math.round((stats.welcome_open_success / stats.welcome_open_click) * 1000) / 10
    : 0;
  const feedbackRate = stats.uninstall > 0
    ? Math.round((stats.uninstall_feedback / stats.uninstall) * 1000) / 10
    : 0;
  return [
    `Установки: ${stats.install}`,
    `Удаления: ${stats.uninstall}`,
    `С обратной связью: ${stats.uninstall_feedback} (${feedbackRate}%)`,
    '',
    `Welcome показан: ${stats.welcome_view}`,
    `Нажали «Перейти к приложению»: ${stats.welcome_open_click}`,
    `Не нажали: ${notClicked}`,
    `Успешно открыли приложение: ${stats.welcome_open_success}`,
    `Ошибка открытия: ${stats.welcome_open_error}`,
    `CTR кнопки: ${clickRate}%`,
    `Успех после клика: ${successRate}%`,
  ].join('\n');
}

async function telegramCall(env, method, payload) {
  if (!env?.TG_BOT_TOKEN || !env?.TG_CHAT_ID) return null;
  const response = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TG_CHAT_ID, ...payload }),
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null);
  return body?.ok ? body.result : null;
}

export async function sendTelegram(env, text) {
  return telegramCall(env, 'sendMessage', { text, disable_web_page_preview: true });
}

export async function editTelegram(env, messageId, text) {
  if (!messageId) return null;
  return telegramCall(env, 'editMessageText', {
    message_id: Number(messageId),
    text,
    disable_web_page_preview: true,
  });
}

export function reasonTextRu(keys = []) {
  const clean = Array.isArray(keys) ? keys.filter((x) => typeof x === 'string') : [];
  if (!clean.length) return 'Не указана';
  return clean.map((k) => REASON_RU[k] || k).join('; ');
}

export function installMessage({ p, v, locale, country, isTest, today }) {
  const prefix = isTest ? '🧪 МОЙ ТЕСТ — УСТАНОВКА' : '🟢 УСТАНОВКА';
  return [
    `${prefix} — ${productName(p)}`,
    v ? `Версия: ${v}` : null,
    locale ? `Язык: ${locale}` : null,
    country ? `Страна: ${country}` : null,
    isTest ? 'В статистику: НЕ включено' : null,
    '',
    `Сегодня: установок ${today.install} · удалений ${today.uninstall}`,
  ].filter((x) => x !== null).join('\n');
}

export function uninstallMessage(record, today) {
  const prefix = record.is_test ? '🧪 МОЙ ТЕСТ — УДАЛЕНИЕ' : '🔴 УДАЛЕНИЕ';
  let feedbackLine = 'Обратная связь: нет';
  if (record.feedback_status === 'submitted') feedbackLine = 'Обратная связь: ✅ есть';
  if (record.feedback_status === 'skipped') feedbackLine = 'Обратная связь: не оставил (нажал «Пропустить»)';
  if (record.feedback_status === 'partial') feedbackLine = 'Обратная связь: частично выбрал причину, но не отправил';

  const lines = [
    `${prefix} — ${productName(record.p)}`,
    feedbackLine,
    record.v ? `Версия: ${record.v}` : null,
    record.locale ? `Язык: ${record.locale}` : null,
    record.country ? `Страна: ${record.country}` : null,
    record.is_test ? 'В статистику: НЕ включено' : null,
  ];

  if (record.feedback_status === 'submitted' || record.feedback_status === 'partial') {
    lines.push(`Причина: ${reasonTextRu(record.reason_keys)}`);
  }
  if (record.comment) lines.push(`Комментарий: ${record.comment}`);

  lines.push('', `Сегодня: установок ${today.install} · удалений ${today.uninstall}`);
  return lines.filter((x) => x !== null).join('\n');
}

export async function getUninstallSession(env, sid) {
  if (!env?.FEEDBACK_KV) return null;
  const raw = await env.FEEDBACK_KV.get(`uninstall:${sid}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function putUninstallSession(env, sid, record) {
  if (!env?.FEEDBACK_KV) return;
  await env.FEEDBACK_KV.put(`uninstall:${sid}`, JSON.stringify(record), { expirationTtl: SESSION_TTL });
}

export function sanitizeComment(value) {
  return typeof value === 'string' ? value.trim().slice(0, 2000) : '';
}
