import { ownerTestInfo, productName } from '../_lib/analytics.js';

// Общий feedback-hub линейки. Хранит только то, что пользователь отправил явно.
// IP используется только для rate-limit и определения тестов владельца; сырой IP
// не записывается ни в KV, ни в Telegram.
const FIELD_LIMITS = { p: 40, channel: 40, src: 40, type: 40, v: 40, text: 5000, email: 200 };
const RATE_LIMIT_PER_MIN = 10;

const TYPE_RU = {
  feedback: 'Обратная связь',
  bug: 'Проблема',
  problem: 'Проблема',
  idea: 'Идея',
  other: 'Другое',
};

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const record = {};
  for (const [field, max] of Object.entries(FIELD_LIMITS)) {
    record[field] = typeof body[field] === 'string' ? body[field].slice(0, max).trim() : '';
  }
  if (!record.text) return json({ ok: false, error: 'empty_text' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const minute = Math.floor(Date.now() / 60000);
  const rlKey = `rl:${await sha256(`${ip}:${minute}`)}`;
  const hits = parseInt((await env.FEEDBACK_KV.get(rlKey)) || '0', 10);
  if (hits >= RATE_LIMIT_PER_MIN) return json({ ok: false, error: 'rate_limited' }, 429);
  await env.FEEDBACK_KV.put(rlKey, String(hits + 1), { expirationTtl: 120 });

  const { isTest, country } = ownerTestInfo(request, env);
  record.at = new Date().toISOString();
  record.is_test = isTest;
  record.country = country;
  const key = `fb:${record.at}:${crypto.randomUUID().slice(0, 8)}`;
  await env.FEEDBACK_KV.put(key, JSON.stringify(record), { expirationTtl: 90 * 24 * 3600 });

  if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    const prefix = isTest ? '🧪 МОЙ ТЕСТ — ОБРАТНАЯ СВЯЗЬ' : '💬 ОБРАТНАЯ СВЯЗЬ';
    const lines = [
      `${prefix} — ${productName(record.p)}`,
      `Тип: ${TYPE_RU[record.type] || record.type || 'Обратная связь'}`,
      record.v ? `Версия: ${record.v}` : null,
      record.channel ? `Канал: ${record.channel}` : null,
      record.src ? `Источник: ${record.src}` : null,
      country ? `Страна: ${country}` : null,
      isTest ? 'В статистику: НЕ включено' : null,
      '',
      record.text,
      record.email ? `Ответить: ${record.email}` : null,
    ].filter((x) => x !== null);

    context.waitUntil(
      fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: lines.join('\n') }),
      }).catch(() => {})
    );
  }

  return json({ ok: true }, 200);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function sha256(s) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
