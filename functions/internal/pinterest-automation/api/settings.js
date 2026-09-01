import { json, requireAdmin } from '../../../_lib/pinterest-automation-admin.js';
import { getSettings, saveSettings } from '../../../_lib/pinterest-automation-data.js';

const APPROVAL = new Set(['manual','new_topics','auto_checked']);
const FORMATS = new Set(['vertical_pin','video_pin']);

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  return json({ ok:true, settings:await getSettings(env) });
}

export async function onRequestPatch({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok:false, error:'bad_json' },400); }

  const current = await getSettings(env);
  const next = { ...current };

  if (body?.daily_limit !== undefined) {
    next.daily_limit = clampInt(body.daily_limit,1,100,current.daily_limit);
  }

  if (body?.approval_mode !== undefined) {
    if (!APPROVAL.has(body.approval_mode)) return json({ ok:false, error:'invalid_approval_mode' },400);
    next.approval_mode = body.approval_mode;
  }

  if (body?.primary_format !== undefined) {
    if (!FORMATS.has(body.primary_format)) return json({ ok:false, error:'invalid_primary_format' },400);
    next.primary_format = body.primary_format;
  }

  if (body?.sandbox_auto_publish !== undefined) {
    next.sandbox_auto_publish = Boolean(body.sandbox_auto_publish);
  }

  next.production_live = false;
  const saved = await saveSettings(env,next);
  return json({ ok:true, settings:saved });
}
