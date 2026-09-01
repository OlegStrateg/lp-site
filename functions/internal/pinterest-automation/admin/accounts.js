import {
  deleteAccount,
  json,
  listAccounts,
  makeAccountId,
  publicAccount,
  requireAdmin,
  saveAccount,
} from '../../../_lib/pinterest-automation-admin.js';
import { pinterestFailure, pinterestRequest } from '../../../_lib/pinterest-automation-client.js';

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const rows = await listAccounts(env);
  return json({ ok: true, items: rows.map(publicAccount) });
}

export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const environment = body?.environment === 'sandbox' ? 'sandbox' : null;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const label = typeof body?.label === 'string'
    ? body.label.replace(/[<>\u0000-\u001F\u007F]/g, '').trim().slice(0, 100)
    : '';

  if (!environment) return json({ ok: false, error: 'only_sandbox_manual_token_supported' }, 400);
  if (!token || token.length < 30) return json({ ok: false, error: 'token_required' }, 400);

  const candidate = { environment, token };

  const accountCheck = await pinterestRequest(candidate, '/user_account');
  if (accountCheck.error) return json({ ok: false, error: accountCheck.error }, 502);
  if (!accountCheck.response.ok) {
    return json(
      pinterestFailure(accountCheck.data, accountCheck.response.status),
      accountCheck.response.status === 401 ? 401 : 400
    );
  }

  const boardsCheck = await pinterestRequest(candidate, '/boards?page_size=100');
  if (boardsCheck.error) return json({ ok: false, error: boardsCheck.error }, 502);
  if (!boardsCheck.response.ok) {
    return json(
      pinterestFailure(boardsCheck.data, boardsCheck.response.status),
      boardsCheck.response.status === 401 ? 401 : 400
    );
  }

  const now = new Date().toISOString();
  const user = accountCheck.data || {};
  const boards = Array.isArray(boardsCheck.data?.items) ? boardsCheck.data.items : [];
  const existing = (await listAccounts(env)).find(x =>
    x.environment === environment &&
    x.username &&
    user.username &&
    x.username === user.username
  );

  const account = {
    id: existing?.id || makeAccountId(),
    environment,
    label: label || user.business_name || user.username || 'Pinterest Sandbox',
    username: user.username || null,
    account_type: user.account_type || null,
    token,
    connected_at: existing?.connected_at || now,
    checked_at: now,
    board_count: boards.length,
    status: 'connected',
  };

  await saveAccount(env, account);
  return json({ ok: true, account: publicAccount(account) }, existing ? 200 : 201);
}

export async function onRequestDelete({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return json({ ok: false, error: 'account_id_required' }, 400);

  await deleteAccount(env, id);
  return json({ ok: true });
}
