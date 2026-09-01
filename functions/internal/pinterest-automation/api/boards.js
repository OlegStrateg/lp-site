import { json, requireAuthorized } from '../../../_lib/pinterest-automation-auth.js';
import { pinterestSandboxFetch, readPinterestJson } from '../../../_lib/pinterest-automation-sandbox.js';

export async function onRequestGet({ request, env }) {
  const denied = await requireAuthorized(request, env);
  if (denied) return denied;

  const { response, error } = await pinterestSandboxFetch(env, '/boards?page_size=100');
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

  const items = Array.isArray(data?.items) ? data.items : [];
  return json({
    ok: true,
    items: items.map((board) => ({
      id: String(board.id || ''),
      name: String(board.name || ''),
      privacy: board.privacy || null,
    })),
    bookmark: data?.bookmark || null,
  });
}
