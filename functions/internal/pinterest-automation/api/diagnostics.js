import { getAccount, json, requireAdmin, saveAccount } from '../../../_lib/pinterest-automation-admin.js';
import { pinterestFailure, pinterestRequest } from '../../../_lib/pinterest-automation-client.js';

function summarizeMetrics(pinMetrics) {
  if (!pinMetrics || typeof pinMetrics !== 'object') {
    return { available: false, key_count: 0, keys: [], data: null };
  }

  const keys = Object.keys(pinMetrics);
  return {
    available: keys.length > 0,
    key_count: keys.length,
    keys: keys.slice(0, 30),
    data: pinMetrics,
  };
}

function sortPins(items) {
  return [...items].sort((a, b) => {
    const at = Date.parse(a?.created_at || '') || 0;
    const bt = Date.parse(b?.created_at || '') || 0;
    return bt - at;
  });
}

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const accountId = (url.searchParams.get('account_id') || '').trim();
  const account = await getAccount(env, accountId);

  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  if (account.environment !== 'sandbox') {
    return json({ ok: false, error: 'sandbox_account_required' }, 400);
  }

  let pinId = account.last_pin_id || null;
  let listPinsPassed = false;
  let listedPinCount = null;

  if (!pinId) {
    const listResult = await pinterestRequest(account, '/pins?page_size=25&pin_metrics=true');

    if (listResult.error) {
      return json({ ok: false, error: listResult.error }, 502);
    }

    if (!listResult.response.ok) {
      return json(
        pinterestFailure(listResult.data, listResult.response.status),
        listResult.response.status >= 500 ? 502 : listResult.response.status
      );
    }

    const items = Array.isArray(listResult.data?.items) ? listResult.data.items : [];
    listedPinCount = items.length;
    listPinsPassed = true;

    const latest = sortPins(items)[0] || null;
    pinId = latest?.id ? String(latest.id) : null;
  } else {
    listPinsPassed = true;
  }

  if (!pinId) {
    return json({
      ok: true,
      account_id: account.id,
      verified: false,
      reason: 'no_pins',
      checks: {
        list_pins: listPinsPassed,
        get_pin: false,
        id_match: false,
        board_present: false,
        metrics_available: false,
      },
      listed_pin_count: listedPinCount,
      pin: null,
      metrics: { available: false, key_count: 0, keys: [], data: null },
      verified_at: new Date().toISOString(),
    });
  }

  const pinResult = await pinterestRequest(account, `/pins/${pinId}?pin_metrics=true`);

  if (pinResult.error) {
    return json({ ok: false, error: pinResult.error }, 502);
  }

  if (!pinResult.response.ok) {
    return json(
      pinterestFailure(pinResult.data, pinResult.response.status),
      pinResult.response.status >= 500 ? 502 : pinResult.response.status
    );
  }

  const returnedId = String(pinResult.data?.id || '');
  const boardId = String(pinResult.data?.board_id || '');
  const metrics = summarizeMetrics(pinResult.data?.pin_metrics);
  const verifiedAt = new Date().toISOString();
  const verified = returnedId === pinId && Boolean(boardId);

  account.last_pin_id = pinId;
  account.last_pin_created_at = pinResult.data?.created_at || account.last_pin_created_at || null;
  account.last_pin_verified = verified;
  account.last_pin_metrics_available = metrics.available;
  account.last_pin_checked_at = verifiedAt;
  await saveAccount(env, account);

  return json({
    ok: true,
    account_id: account.id,
    verified,
    checks: {
      list_pins: listPinsPassed,
      get_pin: true,
      id_match: returnedId === pinId,
      board_present: Boolean(boardId),
      metrics_available: metrics.available,
    },
    listed_pin_count: listedPinCount,
    pin: {
      id: returnedId,
      board_id: boardId,
      title: pinResult.data?.title || '',
      description: pinResult.data?.description || '',
      link: pinResult.data?.link || null,
      created_at: pinResult.data?.created_at || null,
    },
    metrics,
    analytics_note: metrics.available
      ? 'Pin summary metrics returned by Get Pin.'
      : 'Pinterest Sandbox did not return pin_metrics. Dedicated organic analytics are validated later on Trial/Production.',
    verified_at: verifiedAt,
  });
}
