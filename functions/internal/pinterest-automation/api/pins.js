import { getAccount, json, requireAdmin } from '../../../_lib/pinterest-automation-admin.js';
import { pinterestFailure, pinterestRequest } from '../../../_lib/pinterest-automation-client.js';

const MAX = { title: 100, description: 500, alt_text: 500, link: 2048, image_url: 2048 };

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  if (body?.confirm !== 'CREATE_SANDBOX_PIN') {
    return json({ ok: false, error: 'confirmation_required' }, 400);
  }

  const account = await getAccount(env, text(body.account_id, 100));
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  if (account.environment !== 'sandbox') return json({ ok: false, error: 'sandbox_account_required' }, 400);

  const boardId = text(body.board_id, 32);
  const title = text(body.title, MAX.title);
  const description = text(body.description, MAX.description);
  const altText = text(body.alt_text, MAX.alt_text);
  const link = httpsUrl(text(body.link, MAX.link));
  const imageUrl = httpsUrl(text(body.image_url, MAX.image_url));

  if (!/^\d+$/.test(boardId)) return json({ ok: false, error: 'invalid_board_id' }, 400);
  if (!title) return json({ ok: false, error: 'title_required' }, 400);
  if (!imageUrl) return json({ ok: false, error: 'https_image_url_required' }, 400);

  const payload = {
    board_id: boardId,
    title,
    description,
    alt_text: altText,
    media_source: { source_type: 'image_url', url: imageUrl },
  };
  if (link) payload.link = link;

  const result = await pinterestRequest(account, '/pins', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) return json({ ok: false, error: result.error }, 502);
  if (!result.response.ok) {
    return json(
      pinterestFailure(result.data, result.response.status),
      result.response.status >= 500 ? 502 : result.response.status
    );
  }

  return json({
    ok: true,
    account_id: account.id,
    pin: {
      id: String(result.data?.id || ''),
      board_id: String(result.data?.board_id || boardId),
      title: result.data?.title || title,
      link: result.data?.link || link || null,
      created_at: result.data?.created_at || null,
    },
  }, 201);
}
