import { getAccount, json, requireAdmin } from '../../../_lib/pinterest-automation-admin.js';
import { pinterestFailure, pinterestRequest } from '../../../_lib/pinterest-automation-client.js';

const METRIC_ALIASES = {
  impressions: ['IMPRESSION','IMPRESSIONS','impression','impressions'],
  saves: ['SAVE','SAVES','save','saves'],
  pin_clicks: ['PIN_CLICK','PIN_CLICKS','pin_click','pin_clicks'],
  outbound_clicks: ['OUTBOUND_CLICK','OUTBOUND_CLICKS','outbound_click','outbound_clicks'],
};

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function findMetric(node, aliases) {
  if (!node || typeof node !== 'object') return null;

  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(node,key)) {
      const n = Number(node[key]);
      if (Number.isFinite(n)) return n;
    }
  }

  const preferred = ['lifetime','90d','30d','7d','all_time','summary'];
  for (const key of preferred) {
    if (node[key] && typeof node[key] === 'object') {
      const value = findMetric(node[key],aliases);
      if (value !== null) return value;
    }
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      const found = findMetric(value,aliases);
      if (found !== null) return found;
    }
  }

  return null;
}

function normalizeMetrics(pinMetrics) {
  const out = {};
  for (const [name,aliases] of Object.entries(METRIC_ALIASES)) {
    out[name] = numberOrZero(findMetric(pinMetrics,aliases));
  }
  out.ctr = out.impressions > 0 ? out.outbound_clicks / out.impressions : 0;
  out.save_rate = out.impressions > 0 ? out.saves / out.impressions : 0;
  return out;
}

function publicPin(pin) {
  const metrics = normalizeMetrics(pin?.pin_metrics);
  return {
    id: String(pin?.id || ''),
    board_id: String(pin?.board_id || ''),
    title: pin?.title || '',
    description: pin?.description || '',
    link: pin?.link || null,
    created_at: pin?.created_at || null,
    media: pin?.media || null,
    metrics,
  };
}

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const accountId = (url.searchParams.get('account_id') || '').trim();
  const account = await getAccount(env,accountId);
  if (!account) return json({ ok:false, error:'account_not_found' },404);

  const result = await pinterestRequest(account,'/pins?page_size=100&pin_metrics=true');
  if (result.error) return json({ ok:false, error:result.error },502);
  if (!result.response.ok) {
    return json(
      pinterestFailure(result.data,result.response.status),
      result.response.status >= 500 ? 502 : result.response.status
    );
  }

  const pins = (Array.isArray(result.data?.items) ? result.data.items : []).map(publicPin);
  const totals = pins.reduce((acc,pin) => {
    acc.impressions += pin.metrics.impressions;
    acc.saves += pin.metrics.saves;
    acc.pin_clicks += pin.metrics.pin_clicks;
    acc.outbound_clicks += pin.metrics.outbound_clicks;
    return acc;
  },{ impressions:0,saves:0,pin_clicks:0,outbound_clicks:0 });

  totals.ctr = totals.impressions > 0 ? totals.outbound_clicks / totals.impressions : 0;
  totals.save_rate = totals.impressions > 0 ? totals.saves / totals.impressions : 0;

  const top = [...pins].sort((a,b) => {
    if (b.metrics.outbound_clicks !== a.metrics.outbound_clicks) return b.metrics.outbound_clicks - a.metrics.outbound_clicks;
    if (b.metrics.saves !== a.metrics.saves) return b.metrics.saves - a.metrics.saves;
    return b.metrics.impressions - a.metrics.impressions;
  }).slice(0,12);

  return json({
    ok:true,
    account_id:account.id,
    environment:account.environment,
    totals,
    pins,
    top,
    bookmark:result.data?.bookmark || null,
    source:'pins_pin_metrics',
  });
}
