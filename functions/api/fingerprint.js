// Fingerprint endpoint — собирает параметры идентификации пользователя
// для аналитики, лимитов и группировки обратной связи.
// Возвращает user_hash (SHA-256 от комбинации параметров).

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  // Клиентские данные (из JS)
  const clientId = sanitizeString(body.client_id, 64);
  const sessionId = sanitizeString(body.session_id, 64);
  const screen = sanitizeString(body.screen, 40); // "1920x1080"
  const timezone = sanitizeString(body.timezone, 60); // "Europe/Moscow"
  const language = sanitizeString(body.language, 20); // "ru-RU"
  const canvasFp = sanitizeString(body.canvas_fp, 64);

  // Серверные данные (из заголовков)
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);
  const acceptLanguage = (request.headers.get('accept-language') || '').slice(0, 100);
  const country = request.cf?.country || 'unknown';
  const asn = request.cf?.asn || 'unknown';

  // Cloudflare не предоставляет JA3 напрямую, пропускаем
  const tlsFingerprint = '';

  // Парсим User-Agent для браузера и ОС
  const browser = detectBrowser(userAgent);
  const os = detectOS(userAgent);

  // Composite hash — основной ID для группировки
  const hashInput = [ip, userAgent, acceptLanguage, timezone, screen, language].join('::');
  const userHash = await sha256(hashInput);

  // IP hash — для хранения без раскрытия сырого IP
  const ipHash = await sha256(ip);

  const fingerprint = {
    user_hash: userHash,
    client_id: clientId,
    session_id: sessionId,
    screen,
    timezone,
    language,
    canvas_fp: canvasFp,
    ip_hash: ipHash,
    user_agent: userAgent,
    accept_language: acceptLanguage,
    country,
    asn,
    tls_fingerprint: tlsFingerprint,
    browser,
    os,
    timestamp: new Date().toISOString(),
  };

  return json({ ok: true, fingerprint }, 200);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function sanitizeString(value, maxLen) {
  return typeof value === 'string' ? value.slice(0, maxLen).trim() : '';
}

function detectBrowser(ua) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  return 'Other';
}

function detectOS(ua) {
  if (/Windows NT 10/.test(ua)) return 'Windows 10';
  if (/Windows NT 11/.test(ua)) return 'Windows 11';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Linux/.test(ua)) return 'Linux';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  return 'Other';
}

async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
