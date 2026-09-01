import { getAccount, json, requireAdmin, saveAccount } from '../../../_lib/pinterest-automation-admin.js';
import { pinterestFailure, pinterestRequest } from '../../../_lib/pinterest-automation-client.js';

const MAX = { title: 100, description: 500, alt_text: 500, link: 2048, image_url: 2048 };
const READBACK_DELAYS_MS = [0, 250, 750];

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

function wait(ms) {
  return ms ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
}

function shouldRetryReadback(status) {
  return status === 404 || status === 429 || status >= 500;
}

function summarizeMetrics(pinMetrics) {
  if (!pinMetrics || typeof pinMetrics !== 'object') {
    return { available: false, key_count: 0, keys: [] };
  }
  const keys = Object.keys(pinMetrics);
  return {
    available: keys.length > 0,
    key_count: keys.length,
    keys: keys.slice(0, 30),
  };
}

async function verifyCreatedPin(account, pinId, expectedBoardId) {
  let last = null;

  for (const delay of READBACK_DELAYS_MS) {
    await wait(delay);
    const result = await pinterestRequest(account, `/pins/${pinId}?pin_metrics=true`);
    last = result;

    if (result.error) {
      continue;
    }

    if (result.response.ok) {
      const returnedId = String(result.data?.id || '');
      const returnedBoardId = String(result.data?.board_id || '');
      return {
        ok: returnedId === pinId && returnedBoardId === expectedBoardId,
        get_pin: true,
        id_match: returnedId === pinId,
        board_match: returnedBoardId === expectedBoardId,
        pinterest_status: result.response.status,
        attempts: READBACK_DELAYS_MS.indexOf(delay) + 1,
        metrics: summarizeMetrics(result.data?.pin_metrics),
        pin: {
          id: returnedId,
          board_id: returnedBoardId,
          title: result.data?.title || '',
          created_at: result.data?.created_at || null,
        },
      };
    }

    if (!shouldRetryReadback(result.response.status)) break;
  }

  return {
    ok: false,
    get_pin: false,
    id_match: false,
    board_match: false,
    pinterest_status: last?.response?.status || null,
    attempts: READBACK_DELAYS_MS.length,
    metrics: { available: false, key_count: 0, keys: [] },
  };
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

  const pinId = String(result.data?.id || '');
  const createdAt = result.data?.created_at || null;
  const verification = pinId
    ? await verifyCreatedPin(account, pinId, boardId)
    : {
        ok: false,
        get_pin: false,
        id_match: false,
        board_match: false,
        pinterest_status: null,
        attempts: 0,
        metrics: { available: false, key_count: 0, keys: [] },
      };

  account.last_pin_id = pinId || null;
  account.last_pin_created_at = createdAt;
  account.last_pin_verified = Boolean(verification.ok);
  account.last_pin_metrics_available = Boolean(verification.metrics?.available);
  account.last_pin_checked_at = new Date().toISOString();
  await saveAccount(env, account);

  return json({
    ok: true,
    account_id: account.id,
    pin: {
      id: pinId,
      board_id: String(result.data?.board_id || boardId),
      title: result.data?.title || title,
      link: result.data?.link || link || null,
      created_at: createdAt,
    },
    verification,
  }, 201);
}
