import { collectAll, analyze } from './parser.js';
import { renderDashboard } from './ui.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive'
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        service: 'fashion-radar-cloudflare',
        version: 'fashion-radar-cloudflare-web-v0.1'
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/run') {
      let body = {};
      try {
        body = await request.json();
      } catch (_) {}

      const targetGeo = String(body.target_geo || 'RU').trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9_-]{1,7}$/.test(targetGeo)) {
        return json({ ok: false, error: 'Некорректный код рынка' }, 400);
      }

      const generatedAt = new Date().toISOString();
      const result = await collectAll(targetGeo);
      const candidates = analyze(result.rows, targetGeo);
      const okSources = result.batches.filter(function (item) {
        return item.status === 'ok';
      }).length;

      return json({
        ok: true,
        status: okSources === result.batches.length ? 'complete' : 'partial',
        version: 'fashion-radar-cloudflare-web-v0.1',
        generated_at: generatedAt,
        target_geo: targetGeo,
        summary: {
          configured_sources: result.batches.length,
          ok_sources: okSources,
          failed_sources: result.batches.length - okSources,
          raw_records: result.rows.length
        },
        collectors: result.batches.map(function (item) {
          const copy = Object.assign({}, item);
          delete copy.rows;
          return copy;
        }),
        candidates,
        mode: 'observational_uncalibrated',
        guards: {
          no_trend_score: true,
          no_probability: true,
          no_fixed_regional_lag: true,
          no_buy_recommendation: true
        }
      });
    }

    if (request.method === 'GET' && url.pathname === '/run') {
      const targetGeo = String(url.searchParams.get('target_geo') || 'RU').trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9_-]{1,7}$/.test(targetGeo)) {
        return new Response(renderDashboard(null, 'RU'), {
          status: 400,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'x-robots-tag': 'noindex, nofollow, noarchive'
          }
        });
      }

      const generatedAt = new Date().toISOString();
      const result = await collectAll(targetGeo);
      const candidates = analyze(result.rows, targetGeo);
      const okSources = result.batches.filter(function (item) {
        return item.status === 'ok';
      }).length;
      const data = {
        ok: true,
        status: okSources === result.batches.length ? 'complete' : 'partial',
        version: 'fashion-radar-cloudflare-web-v0.2',
        generated_at: generatedAt,
        target_geo: targetGeo,
        summary: {
          configured_sources: result.batches.length,
          ok_sources: okSources,
          failed_sources: result.batches.length - okSources,
          raw_records: result.rows.length
        },
        collectors: result.batches.map(function (item) {
          const copy = Object.assign({}, item);
          delete copy.rows;
          return copy;
        }),
        candidates
      };

      return new Response(renderDashboard(data, targetGeo), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow, noarchive'
        }
      });
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return new Response(renderDashboard(null, 'RU'), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow, noarchive'
        }
      });
    }

    return new Response('Not found', {
      status: 404,
      headers: {
        'x-robots-tag': 'noindex, nofollow, noarchive'
      }
    });
  }
};
