import { getAccount, json, requireAdmin, saveAccount } from '../../../_lib/pinterest-automation-admin.js';
import { pinterestFailure, pinterestRequest } from '../../../_lib/pinterest-automation-client.js';

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const accountId = new URL(request.url).searchParams.get('account_id') || '';
  const account = await getAccount(env, accountId);
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);

  const result = await pinterestRequest(account, '/boards?page_size=100');
  if (result.error) return json({ ok: false, error: result.error }, 502);
  if (!result.response.ok) {
    return json(
      pinterestFailure(result.data, result.response.status),
      result.response.status >= 500 ? 502 : result.response.status
    );
  }

  const items = Array.isArray(result.data?.items) ? result.data.items : [];
  return json({
    ok: true,
    account_id: account.id,
    items: items.map(board => ({
      id: String(board.id || ''),
      name: String(board.name || ''),
      privacy: board.privacy || null,
    })),
    bookmark: result.data?.bookmark || null,
  });
}

export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  if (body?.confirm !== 'CREATE_SANDBOX_BOARD') {
    return json({ ok: false, error: 'confirmation_required' }, 400);
  }

  const accountId = typeof body?.account_id === 'string' ? body.account_id.trim() : '';
  const account = await getAccount(env, accountId);
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  if (account.environment !== 'sandbox') {
    return json({ ok: false, error: 'sandbox_account_required' }, 400);
  }

  const name = typeof body?.name === 'string'
    ? body.name.replace(/[<>\u0000-\u001F\u007F]/g, '').trim().slice(0, 180)
    : '';
  const description = typeof body?.description === 'string'
    ? body.description.replace(/[<>\u0000-\u001F\u007F]/g, '').trim().slice(0, 500)
    : '';

  if (!name) return json({ ok: false, error: 'board_name_required' }, 400);

  const result = await pinterestRequest(account, '/boards', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      privacy: 'PUBLIC',
    }),
  });

  if (result.error) return json({ ok: false, error: result.error }, 502);
  if (!result.response.ok) {
    return json(
      pinterestFailure(result.data, result.response.status),
      result.response.status >= 500 ? 502 : result.response.status
    );
  }

  const board = {
    id: String(result.data?.id || ''),
    name: String(result.data?.name || name),
    privacy: result.data?.privacy || 'PUBLIC',
  };

  account.board_count = Math.max(0, Number(account.board_count) || 0) + 1;
  account.checked_at = new Date().toISOString();
  await saveAccount(env, account);

  return json({
    ok: true,
    account_id: account.id,
    board,
  }, 201);
}
