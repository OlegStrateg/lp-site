import { statsForDays, formatStats, productName, sendTelegram, ownerTestInfo } from '../_lib/analytics.js';

const PRODUCTS = new Set(['ic', 'h2f', 'pex', 's2c', 'ds', 'pd', 'eav']);

function normalizeProduct(value) {
  const token = String(value || '').trim().toLowerCase();
  if (PRODUCTS.has(token)) return token;
  if (token === 'pinterest' || token === 'pinterest-downloader' || token === 'pinterest_downloader') return 'pd';
  if (token === 'image' || token === 'image-converter' || token === 'image_converter') return 'ic';
  if (['audio','audio-extractor','audio_extractor','extract-audio','extract_audio','audio-extractor-from-video'].includes(token)) return 'eav';
  return '';
}

function displayProduct(product) {
  return product === 'eav' ? 'Audio Extractor from Video' : productName(product);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const { isTest } = ownerTestInfo(request, env);
  if (!isTest) return new Response('forbidden', { status: 403 });

  if (url.searchParams.get('setup') === '1') {
    if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return new Response('telegram secrets missing', { status: 503 });
    const webhookUrl = `${url.origin}/api/telegram`;
    const payload = { url: webhookUrl, drop_pending_updates: false };
    if (env.TG_WEBHOOK_SECRET) payload.secret_token = env.TG_WEBHOOK_SECRET;
    const response = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/setWebhook`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) return new Response('webhook setup failed', { status: 502 });
    return new Response('ok');
  }

  if (url.searchParams.has('stats')) {
    const days = Math.max(1, Math.min(90, Number(url.searchParams.get('stats') || 1)));
    const product = normalizeProduct(url.searchParams.get('p')) || 'ic';
    const stats = await statsForDays(env, product, days);
    return new Response(JSON.stringify({ ok: true, product, ...stats }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
  return new Response('not found', { status: 404 });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (env.TG_WEBHOOK_SECRET) {
    const supplied = request.headers.get('x-telegram-bot-api-secret-token') || '';
    if (supplied !== env.TG_WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
  }

  let update;
  try { update = await request.json(); }
  catch { return new Response('ok'); }

  const message = update?.message;
  const chatId = String(message?.chat?.id ?? '');
  if (!chatId || chatId !== String(env.TG_CHAT_ID || '')) return new Response('ok');

  const text = String(message?.text || '').trim();
  const match = text.match(/^\/(?:stats|stat|стат|статистика)(?:@\w+)?(?:\s+(.*))?$/i);
  if (!match) return new Response('ok');

  let product = 'ic';
  let days = 7;
  const args = String(match[1] || '').trim().split(/\s+/).filter(Boolean);
  for (const arg of args.slice(0, 2)) {
    const parsedProduct = normalizeProduct(arg);
    if (parsedProduct) { product = parsedProduct; continue; }
    if (/^\d{1,2}$/.test(arg)) { days = Math.max(1, Math.min(90, Number(arg))); continue; }
    return new Response('ok');
  }

  const stats = await statsForDays(env, product, days);
  const title = days === 1 ? 'сегодня' : `${days} дней`;
  const reply = [`📊 ${displayProduct(product)} — ${title}`, '', formatStats(stats)].join('\n');
  await sendTelegram(env, reply).catch(() => {});
  return new Response('ok');
}
