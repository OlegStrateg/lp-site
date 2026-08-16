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
  general: 'Общее',
  other: 'Другое',
};

const COUNTRY_NAMES = {
  RU: 'Россия',
  US: 'США',
  UA: 'Украина',
  BY: 'Беларусь',
  KZ: 'Казахстан',
  GB: 'Великобритания',
  DE: 'Германия',
  FR: 'Франция',
  IT: 'Италия',
  ES: 'Испания',
  PL: 'Польша',
  TR: 'Турция',
  CN: 'Китай',
  IN: 'Индия',
  JP: 'Япония',
  BR: 'Бразилия',
  CA: 'Канада',
  AU: 'Австралия',
  NL: 'Нидерланды',
  SE: 'Швеция',
  CH: 'Швейцария',
  AT: 'Австрия',
  BE: 'Бельгия',
  NO: 'Норвегия',
  DK: 'Дания',
  FI: 'Финляндия',
  PT: 'Португалия',
  GR: 'Греция',
  CZ: 'Чехия',
  IL: 'Израиль',
  AE: 'ОАЭ',
  SA: 'Саудовская Аравия',
  SG: 'Сингапур',
  KR: 'Южная Корея',
  MX: 'Мексика',
  AR: 'Аргентина',
  CL: 'Чили',
  CO: 'Колумбия',
  PE: 'Перу',
  VE: 'Венесуэла',
  ZA: 'ЮАР',
  EG: 'Египет',
  NG: 'Нигерия',
  KE: 'Кения',
  MA: 'Марокко',
  TH: 'Таиланд',
  VN: 'Вьетнам',
  ID: 'Индонезия',
  PH: 'Филиппины',
  MY: 'Малайзия',
  PK: 'Пакистан',
  BD: 'Бангладеш',
  NZ: 'Новая Зеландия',
  IE: 'Ирландия',
  LU: 'Люксембург',
  IS: 'Исландия',
  HU: 'Венгрия',
  RO: 'Румыния',
  BG: 'Болгария',
  HR: 'Хорватия',
  RS: 'Сербия',
  SK: 'Словакия',
  SI: 'Словения',
  LT: 'Литва',
  LV: 'Латвия',
  EE: 'Эстония',
  GE: 'Грузия',
  AM: 'Армения',
  AZ: 'Азербайджан',
  UZ: 'Узбекистан',
  KG: 'Киргизия',
  TJ: 'Таджикистан',
  TM: 'Туркменистан',
  MD: 'Молдова',
  MT: 'Мальта',
  CY: 'Кипр',
  LK: 'Шри-Ланка',
  MM: 'Мьянма',
  KH: 'Камбоджа',
  LA: 'Лаос',
  NP: 'Непал',
  MN: 'Монголия',
  HK: 'Гонконг',
  TW: 'Тайвань',
  MO: 'Макао',
};

function getCountryName(code) {
  return COUNTRY_NAMES[code] || code;
}

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

  // Fingerprint данные (если пришли с клиента)
  const fingerprint = body.fingerprint || {};

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
  record.fingerprint = fingerprint; // сохраняем fingerprint в KV

  const key = `fb:${record.at}:${crypto.randomUUID().slice(0, 8)}`;
  await env.FEEDBACK_KV.put(key, JSON.stringify(record), { expirationTtl: 90 * 24 * 3600 });

  if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    // Парсим диагностику из текста (формат: текст\n---\nkey: value | key: value)
    let mainText = record.text;
    let diagnostics = {};
    const diagSplit = record.text.split('\n---\n');
    if (diagSplit.length === 2) {
      mainText = diagSplit[0];
      const diagLine = diagSplit[1];
      diagLine.split(' | ').forEach((pair) => {
        const [key, ...rest] = pair.split(': ');
        if (key && rest.length > 0) {
          diagnostics[key.trim()] = rest.join(': ').trim();
        }
      });
    }

    // Определяем оценку звёзд если есть
    let rating = null;
    if (record.src === 'stars' && diagnostics.rating) {
      const stars = parseInt(diagnostics.rating, 10);
      if (stars >= 1 && stars <= 5) {
        rating = '⭐️'.repeat(stars);
      }
    }

    // Короткий user_hash для отображения (#a3f9d2e1)
    const userHashShort = record.fingerprint?.user_hash ? `#${record.fingerprint.user_hash.slice(0, 8)}` : null;

    const prefix = isTest ? '🧪 МОЙ ТЕСТ — ОБРАТНАЯ СВЯЗЬ' : '💬 ОБРАТНАЯ СВЯЗЬ';
    const lines = [
      `${prefix} — ${productName(record.p)}`,
      userHashShort ? `ID: ${userHashShort}` : null,
      rating ? `Оценка: ${rating}` : null,
      `Тип: ${TYPE_RU[record.type] || record.type || 'Обратная связь'}`,
      '',
      mainText,
      '',
      diagnostics.version ? `Версия: ${diagnostics.version}` : record.v ? `Версия: ${record.v}` : null,
      record.fingerprint?.browser ? `Браузер: ${record.fingerprint.browser}` : diagnostics.browser ? `Браузер: ${diagnostics.browser}` : null,
      record.fingerprint?.os ? `ОС: ${record.fingerprint.os}` : diagnostics.os ? `ОС: ${diagnostics.os}` : null,
      record.fingerprint?.screen ? `Экран: ${record.fingerprint.screen}` : null,
      record.channel ? `Канал: ${record.channel}` : null,
      record.src && record.src !== 'direct' ? `Источник: ${record.src}` : null,
      country ? `Страна: ${getCountryName(country)}` : null,
      isTest ? 'В статистику: НЕ включено' : null,
      '',
      record.email ? `✉️ Ответить: ${record.email}` : null,
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
