import { getAccount, json, requireAdmin } from '../../../_lib/pinterest-automation-admin.js';
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
