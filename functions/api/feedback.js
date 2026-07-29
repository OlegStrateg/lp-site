// Feedback-hub endpoint (этап 1, 20.07 — see 15_Стратегия-обратной-связи.md).
// One endpoint for the whole converter line: the site form, the uninstall
// survey, and (later) Canva apps all POST here. Payload is product-neutral so
// new products are a registry line, not a new backend.
//
// Data policy (mirrors the privacy page): only what the user explicitly
// submits is stored — no cookies, no fingerprinting, no auto-collection.
// IP is used ONLY inside the rate limiter (hashed key, 2-minute TTL) and is
// never written into the stored record or the Telegram message.
//
// Delivery: KV archive (90-day TTL) always; Telegram push only when
// TG_BOT_TOKEN + TG_CHAT_ID secrets are configured (wrangler pages secret).
// Missing secrets must NOT fail the request — the archive is the source of
// truth, Telegram is a convenience mirror.

const FIELD_LIMITS = { p: 40, channel: 40, src: 40, type: 40, v: 40, text: 5000, email: 200 };
const RATE_LIMIT_PER_MIN = 10;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  const record = {};
  for (const [field, max] of Object.entries(FIELD_LIMITS)) {
    const value = typeof body[field] === 'string' ? body[field].slice(0, max).trim() : '';
    record[field] = value;
  }
  if (!record.text) return json({ ok: false, error: 'empty_text' }, 400);

  // Rate limit per IP: hashed so the raw IP never becomes a KV key.
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const minute = Math.floor(Date.now() / 60000);
  const rlKey = `rl:${await sha256(`${ip}:${minute}`)}`;
  const hits = parseInt((await env.FEEDBACK_KV.get(rlKey)) || '0', 10);
  if (hits >= RATE_LIMIT_PER_MIN) return json({ ok: false, error: 'rate_limited' }, 429);
  await env.FEEDBACK_KV.put(rlKey, String(hits + 1), { expirationTtl: 120 });

  record.at = new Date().toISOString();
  const key = `fb:${record.at}:${crypto.randomUUID().slice(0, 8)}`;
  await env.FEEDBACK_KV.put(key, JSON.stringify(record), { expirationTtl: 90 * 24 * 3600 });

  if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    const lines = [
      `[${record.p || 'site'} · ${record.channel || 'site'} · ${record.src || 'direct'}] ${record.type || 'feedback'}`,
      record.v ? `v${record.v}` : null,
      '',
      record.text,
      record.email ? `\nreply-to: ${record.email}` : null,
    ].filter((l) => l !== null);
    // Fire-and-forget: a Telegram outage must not fail the user's submit.
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
