import { statsForDays, formatStats, productName, sendTelegram, ownerTestInfo } from '../_lib/analytics.js';


export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const { isTest } = ownerTestInfo(request, env);
  if (!isTest) return new Response('forbidden', { status: 403 });

  if (url.searchParams.get('setup') === '1') {
    // One-time/idempotent webhook bootstrap. The bot token never leaves Cloudflare.
    if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return new Response('telegram secrets missing', { status: 503 });

    const webhookUrl = `${url.origin}/api/telegram`;
    const payload = { url: webhookUrl, drop_pending_updates: false };
    if (env.TG_WEBHOOK_SECRET) payload.secret_token = env.TG_WEBHOOK_SECRET;

    const response = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) return new Response('webhook setup failed', { status: 502 });
    return new Response('ok');
  }

  if (url.searchParams.has('stats')) {
    const days = Math.max(1, Math.min(90, Number(url.searchParams.get('stats') || 1)));
    const stats = await statsForDays(env, 'ic', days);
    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }

  return new Response('not found', { status: 404 });
}

// Telegram webhook только для владельца. Команды:
// /stats      -> 7 дней
// /stats 1    -> сегодня
// /stats 30   -> 30 дней
// /стат 7     -> то же по-русски
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
  const match = text.match(/^\/(?:stats|stat|стат|статистика)(?:@\w+)?(?:\s+(\d{1,2}))?\s*$/i);
  if (!match) return new Response('ok');

  const days = Math.max(1, Math.min(90, Number(match[1] || 7)));
  const stats = await statsForDays(env, 'ic', days);
  const title = days === 1 ? 'сегодня' : `${days} дней`;
  const reply = [`📊 ${productName('ic')} — ${title}`, '', formatStats(stats)].join('\n');
  await sendTelegram(env, reply).catch(() => {});

  return new Response('ok');
}
