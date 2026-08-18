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

const COUNTRY_NAMES = {
  AF:'Афганистан',AL:'Албания',DZ:'Алжир',AD:'Андорра',AO:'Ангола',AG:'Антигуа и Барбуда',
  AR:'Аргентина',AM:'Армения',AU:'Австралия',AT:'Австрия',AZ:'Азербайджан',
  BS:'Багамы',BH:'Бахрейн',BD:'Бангладеш',BB:'Барбадос',BY:'Беларусь',BE:'Бельгия',
  BZ:'Белиз',BJ:'Бенин',BT:'Бутан',BO:'Боливия',BA:'Босния и Герцеговина',
  BW:'Ботсвана',BR:'Бразилия',BN:'Бруней',BG:'Болгария',BF:'Буркина-Фасо',BI:'Бурунди',
  CV:'Кабо-Верде',KH:'Камбоджа',CM:'Камерун',CA:'Канада',CF:'ЦАР',TD:'Чад',
  CL:'Чили',CN:'Китай',CO:'Колумбия',KM:'Коморы',CD:'ДР Конго',CG:'Конго',
  CR:'Коста-Рика',HR:'Хорватия',CU:'Куба',CY:'Кипр',CZ:'Чехия',DK:'Дания',
  DJ:'Джибути',DM:'Доминика',DO:'Доминиканская Республика',EC:'Эквадор',EG:'Египет',
  SV:'Сальвадор',GQ:'Экваториальная Гвинея',ER:'Эритрея',EE:'Эстония',SZ:'Эсватини',
  ET:'Эфиопия',FJ:'Фиджи',FI:'Финляндия',FR:'Франция',GA:'Габон',GM:'Гамбия',
  GE:'Грузия',DE:'Германия',GH:'Гана',GR:'Греция',GD:'Гренада',GT:'Гватемала',
  GN:'Гвинея',GW:'Гвинея-Бисау',GY:'Гайана',HT:'Гаити',HN:'Гондурас',HU:'Венгрия',
  IS:'Исландия',IN:'Индия',ID:'Индонезия',IR:'Иран',IQ:'Ирак',IE:'Ирландия',
  IL:'Израиль',IT:'Италия',JM:'Ямайка',JP:'Япония',JO:'Иордания',KZ:'Казахстан',
  KE:'Кения',KI:'Кирибати',KW:'Кувейт',KG:'Кыргызстан',LA:'Лаос',LV:'Латвия',
  LB:'Ливан',LS:'Лесото',LR:'Либерия',LY:'Ливия',LI:'Лихтенштейн',LT:'Литва',
  LU:'Люксембург',MG:'Мадагаскар',MW:'Малави',MY:'Малайзия',MV:'Мальдивы',
  ML:'Мали',MT:'Мальта',MH:'Маршалловы острова',MR:'Мавритания',MU:'Маврикий',
  MX:'Мексика',FM:'Микронезия',MD:'Молдова',MC:'Монако',MN:'Монголия',ME:'Черногория',
  MA:'Марокко',MZ:'Мозамбик',MM:'Мьянма',NA:'Намибия',NR:'Науру',NP:'Непал',
  NL:'Нидерланды',NZ:'Новая Зеландия',NI:'Никарагуа',NE:'Нигер',NG:'Нигерия',
  NO:'Норвегия',OM:'Оман',PK:'Пакистан',PW:'Палау',PA:'Панама',PG:'Папуа — Новая Гвинея',
  PY:'Парагвай',PE:'Перу',PH:'Филиппины',PL:'Польша',PT:'Португалия',QA:'Катар',
  RO:'Румыния',RU:'Россия',RW:'Руанда',KN:'Сент-Китс и Невис',LC:'Сент-Люсия',
  VC:'Сент-Винсент',WS:'Самоа',SM:'Сан-Марино',ST:'Сан-Томе и Принсипи',SA:'Саудовская Аравия',
  SN:'Сенегал',RS:'Сербия',SC:'Сейшелы',SL:'Сьерра-Леоне',SG:'Сингапур',SK:'Словакия',
  SI:'Словения',SB:'Соломоновы острова',SO:'Сомали',ZA:'ЮАР',SS:'Южный Судан',ES:'Испания',
  LK:'Шри-Ланка',SD:'Судан',SR:'Суринам',SE:'Швеция',CH:'Швейцария',SY:'Сирия',
  TW:'Тайвань',TJ:'Таджикистан',TZ:'Танзания',TH:'Таиланд',TL:'Тимор-Лесте',
  TG:'Того',TO:'Тонга',TT:'Тринидад и Тобаго',TN:'Тунис',TR:'Турция',TM:'Туркменистан',
  TV:'Тувалу',UG:'Уганда',UA:'Украина',AE:'ОАЭ',GB:'Великобритания',US:'США',
  UY:'Уругвай',UZ:'Узбекистан',VU:'Вануату',VE:'Венесуэла',VN:'Вьетнам',YE:'Йемен',
  ZM:'Замбия',ZW:'Зимбабве',
};

function countryName(code) {
  return code ? (COUNTRY_NAMES[code.toUpperCase()] || code) : '';
}

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

export async function statsTotal(env, p) {
  const counts = {
    install: 0,
    uninstall: 0,
  };

  if (!env?.FEEDBACK_KV) return counts;

  let cursor;
  do {
    const page = await env.FEEDBACK_KV.list({ prefix: `stats:${p}:`, cursor, limit: 1000 });
    for (const { name } of page.keys) {
      const parts = name.split(':');
      const event = parts[3] || '';
      if (event === 'install') counts.install += 1;
      else if (event === 'uninstall') counts.uninstall += 1;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return counts;
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

export function installMessage({ p, v, locale, country, isTest, today, total }) {
  const prefix = isTest ? '🧪 МОЙ ТЕСТ — УСТАНОВКА' : '🟢 УСТАНОВКА';
  return [
    `${prefix} — ${productName(p)}`,
    '',
    v ? `Версия: ${v}` : null,
    locale ? `Язык: ${locale}` : null,
    country ? `Страна: ${countryName(country)}` : null,
    isTest ? 'В статистику: НЕ включено' : null,
    '',
    `Сегодня: установок ${today.install} · удалений ${today.uninstall}`,
    `Всего: установок ${total.install} · удалений ${total.uninstall}`,
  ].filter((x) => x !== null).join('\n');
}

export function uninstallMessage(record, today, total) {
  const prefix = record.is_test ? '🧪 МОЙ ТЕСТ — УДАЛЕНИЕ' : '🔴 УДАЛЕНИЕ';
  let feedbackLine = 'Обратная связь: нет';
  if (record.feedback_status === 'submitted') feedbackLine = 'Обратная связь: ✅ есть';
  if (record.feedback_status === 'skipped') feedbackLine = 'Обратная связь: пропустил';
  if (record.feedback_status === 'partial') feedbackLine = 'Обратная связь: частично';

  // Вычисляем время использования
  let usageTime = null;
  if (record.created_at) {
    const installed = new Date(record.created_at).getTime();
    const uninstalled = record.updated_at ? new Date(record.updated_at).getTime() : Date.now();
    const diffMs = uninstalled - installed;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      usageTime = `Использовал: ${diffDays} дн.`;
    } else if (diffHours > 0) {
      usageTime = `Использовал: ${diffHours} ч.`;
    } else if (diffMinutes > 0) {
      usageTime = `Использовал: ${diffMinutes} мин.`;
    } else {
      usageTime = `Использовал: <1 мин.`;
    }
  }

  const lines = [
    `${prefix} — ${productName(record.p)}`,
    feedbackLine,
    usageTime,
    '',
    record.v ? `Версия: ${record.v}` : null,
    record.locale ? `Язык: ${record.locale}` : null,
    record.country ? `Страна: ${countryName(record.country)}` : null,
    record.is_test ? 'В статистику: НЕ включено' : null,
  ];

  if (record.feedback_status === 'submitted' || record.feedback_status === 'partial') {
    lines.push('', `Причина: ${reasonTextRu(record.reason_keys)}`);
  }
  if (record.comment) lines.push(`Комментарий: ${record.comment}`);

  lines.push('', `Сегодня: установок ${today.install} · удалений ${today.uninstall}`);
  lines.push(`Всего: установок ${total.install} · удалений ${total.uninstall}`);
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

export async function getInstallSession(env, sid) {
  if (!env?.FEEDBACK_KV) return null;
  const raw = await env.FEEDBACK_KV.get(`install:${sid}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function putInstallSession(env, sid, record) {
  if (!env?.FEEDBACK_KV) return;
  await env.FEEDBACK_KV.put(`install:${sid}`, JSON.stringify(record), { expirationTtl: SESSION_TTL });
}

export function installSessionMessage({ record, today, total }) {
  const prefix = record.is_test ? '🧪 МОЙ ТЕСТ — УСТАНОВКА' : '🟢 УСТАНОВКА';
  const statusLines = [];
  if (record.pinned)        statusLines.push('Запинил: ✅');
  if (record.panel_opened)  statusLines.push('Открыл панель: ✅');
  if (record.abandoned)     statusLines.push('Закрыл без действий: ⚠️');

  return [
    `${prefix} — ${productName(record.p)}`,
    record.v      ? `Версия: ${record.v}`     : null,
    record.locale ? `Язык: ${record.locale}`  : null,
    record.country? `Страна: ${countryName(record.country)}`: null,
    record.is_test ? 'В статистику: НЕ включено' : null,
    ...statusLines,
    '',
    `Сегодня: установок ${today.install} · удалений ${today.uninstall}`,
    total ? `Всего: установок ${total.install} · удалений ${total.uninstall}` : null,
  ].filter((x) => x !== null).join('\n');
}
