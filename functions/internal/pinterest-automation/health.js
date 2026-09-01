export function onRequestGet({ env }) {
  const pinterestConfigured = Boolean(env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET);

  return new Response(JSON.stringify({
    ok: true,
    service: 'pinterest-automation-preview',
    version: '0.0.1',
    mode: 'preview',
    livePublishing: false,
    pinterestConfigured,
    database: 'not_connected',
    worker: 'not_connected',
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  });
}
