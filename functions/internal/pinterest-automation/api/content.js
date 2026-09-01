import { json, requireAdmin } from '../../../_lib/pinterest-automation-admin.js';
import {
  deleteContent,
  getContent,
  getKv,
  listContent,
  makeContentId,
  saveContent,
} from '../../../_lib/pinterest-automation-data.js';

const STATUSES = new Set(['draft','approved','queued','published','error','canceled']);

function cleanText(value, max = 500) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max)
    : '';
}

function cleanUrl(value) {
  const raw = cleanText(value, 2048);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function publicItem(item) {
  return {
    id: item.id,
    account_id: item.account_id || null,
    board_id: item.board_id || null,
    topic: item.topic || '',
    title: item.title || '',
    description: item.description || '',
    alt_text: item.alt_text || '',
    destination_url: item.destination_url || '',
    image_url: item.image_url || '',
    status: item.status || 'draft',
    source: item.source || 'manual',
    pin_id: item.pin_id || null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!getKv(env)) return json({ ok:false, error:'storage_not_configured' },503);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    const item = await getContent(env, id);
    return item ? json({ ok:true, item:publicItem(item) }) : json({ ok:false, error:'content_not_found' },404);
  }

  const status = cleanText(url.searchParams.get('status'), 30);
  const accountId = cleanText(url.searchParams.get('account_id'), 100);
  let items = await listContent(env);
  if (status) items = items.filter(x => x.status === status);
  if (accountId) items = items.filter(x => x.account_id === accountId);
  items.sort((a,b) => String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
  return json({ ok:true, items:items.map(publicItem) });
}

export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok:false, error:'bad_json' },400); }

  const title = cleanText(body?.title, 100);
  const imageUrl = cleanUrl(body?.image_url);
  const accountId = cleanText(body?.account_id, 100);
  const boardId = cleanText(body?.board_id, 32);

  if (!title) return json({ ok:false, error:'title_required' },400);
  if (!imageUrl) return json({ ok:false, error:'https_image_url_required' },400);
  if (!/^acct_[A-Za-z0-9_-]{8,80}$/.test(accountId)) return json({ ok:false, error:'account_required' },400);
  if (boardId && !/^\d+$/.test(boardId)) return json({ ok:false, error:'invalid_board_id' },400);

  const now = new Date().toISOString();
  const item = {
    id: makeContentId(),
    account_id: accountId,
    board_id: boardId || null,
    topic: cleanText(body?.topic, 160),
    title,
    description: cleanText(body?.description, 500),
    alt_text: cleanText(body?.alt_text, 500),
    destination_url: cleanUrl(body?.destination_url),
    image_url: imageUrl,
    status: 'draft',
    source: 'manual',
    pin_id: null,
    created_at: now,
    updated_at: now,
  };

  await saveContent(env, item);
  return json({ ok:true, item:publicItem(item) },201);
}

export async function onRequestPatch({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id') || '';
  const item = await getContent(env, id);
  if (!item) return json({ ok:false, error:'content_not_found' },404);
  if (item.status === 'published') return json({ ok:false, error:'published_content_locked' },409);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok:false, error:'bad_json' },400); }

  if (body?.status !== undefined) {
    const status = cleanText(body.status, 30);
    if (!STATUSES.has(status)) return json({ ok:false, error:'invalid_status' },400);
    if (status === 'published') return json({ ok:false, error:'published_status_worker_only' },403);
    item.status = status;
  }

  if (body?.topic !== undefined) item.topic = cleanText(body.topic,160);
  if (body?.title !== undefined) {
    const title = cleanText(body.title,100);
    if (!title) return json({ ok:false, error:'title_required' },400);
    item.title = title;
  }
  if (body?.description !== undefined) item.description = cleanText(body.description,500);
  if (body?.alt_text !== undefined) item.alt_text = cleanText(body.alt_text,500);
  if (body?.destination_url !== undefined) item.destination_url = cleanUrl(body.destination_url);
  if (body?.image_url !== undefined) {
    const image = cleanUrl(body.image_url);
    if (!image) return json({ ok:false, error:'https_image_url_required' },400);
    item.image_url = image;
  }
  if (body?.board_id !== undefined) {
    const board = cleanText(body.board_id,32);
    if (board && !/^\d+$/.test(board)) return json({ ok:false, error:'invalid_board_id' },400);
    item.board_id = board || null;
  }

  item.updated_at = new Date().toISOString();
  await saveContent(env,item);
  return json({ ok:true, item:publicItem(item) });
}

export async function onRequestDelete({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id') || '';
  const item = await getContent(env,id);
  if (!item) return json({ ok:false, error:'content_not_found' },404);
  if (['queued','published'].includes(item.status)) return json({ ok:false, error:'content_in_use' },409);

  await deleteContent(env,id);
  return json({ ok:true });
}
