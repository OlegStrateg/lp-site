import { json, requireAuthorized } from '../../../_lib/pinterest-automation-auth.js';
import { pinterestSandboxFetch, readPinterestJson } from '../../../_lib/pinterest-automation-sandbox.js';

export async function onRequestGet({ request, env }) {
  const denied = await requireAuthorized(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const pinId = (url.searchParams.get('pin_id') || '').trim();
  if (!/^\d+$/.test(pinId)) return json({ ok: false, error: 'invalid_pin_id' }, 400);

  const { response, error } = await pinterestSandboxFetch(env, `/pins/${pinId}?pin_metrics=true`);
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
      id: String(data?.id || pinId),
      board_id: String(data?.board_id || ''),
      title: data?.title || '',
      description: data?.description || '',
      link: data?.link || null,
      created_at: data?.created_at || null,
      pin_metrics: data?.pin_metrics || null,
    },
  });
}
