import { json, requireAuthorized } from '../../../_lib/pinterest-automation-auth.js';
import { pinterestSandboxFetch, readPinterestJson } from '../../../_lib/pinterest-automation-sandbox.js';

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
  const denied = await requireAuthorized(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  if (body?.confirm !== 'CREATE_SANDBOX_PIN') {
    return json({ ok: false, error: 'confirmation_required' }, 400);
  }

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
    media_source: {
      source_type: 'image_url',
      url: imageUrl,
    },
  };
  if (link) payload.link = link;

  const { response, error } = await pinterestSandboxFetch(env, '/pins', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (error) return json({ ok: false, error: error.code }, error.status);

  const data = await readPinterestJson(response);
  if (!response.ok) {
    return json({
      ok: false,
      error: 'pinterest_api_error',
      pinterest_status: response.status,
      pinterest_code: data?.code ?? null,
      message: data?.message ?? null,
    }, response.status >= 500 ? 502 : response.status);
  }

  return json({
    ok: true,
    pin: {
      id: String(data?.id || ''),
      board_id: String(data?.board_id || boardId),
      title: data?.title || title,
      link: data?.link || link || null,
      created_at: data?.created_at || null,
    },
  }, 201);
}
