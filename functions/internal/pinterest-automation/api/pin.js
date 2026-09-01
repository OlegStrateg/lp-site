import { getAccount, json, requireAdmin } from '../../../_lib/pinterest-automation-admin.js';
import { pinterestFailure, pinterestRequest } from '../../../_lib/pinterest-automation-client.js';

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const accountId = (url.searchParams.get('account_id') || '').trim();
  const pinId = (url.searchParams.get('pin_id') || '').trim();

  const account = await getAccount(env, accountId);
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  if (!/^\d+$/.test(pinId)) return json({ ok: false, error: 'invalid_pin_id' }, 400);

  const result = await pinterestRequest(account, `/pins/${pinId}?pin_metrics=true`);
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
      id: String(result.data?.id || pinId),
      board_id: String(result.data?.board_id || ''),
      title: result.data?.title || '',
      description: result.data?.description || '',
      link: result.data?.link || null,
      created_at: result.data?.created_at || null,
      pin_metrics: result.data?.pin_metrics || null,
    },
  });
}
