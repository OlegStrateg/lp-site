import { getAccount, json, requireAdmin } from '../../../_lib/pinterest-automation-admin.js';
import {
  getContent,
  getQueueJob,
  getKv,
  listQueue,
  makeQueueId,
  saveContent,
  saveQueueJob,
} from '../../../_lib/pinterest-automation-data.js';

const ACTIVE = new Set(['queued','retry']);
const MUTABLE = new Set(['queued','retry']);

function cleanText(value, max = 500) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max)
    : '';
}

function parseIso(value) {
  const raw = cleanText(value, 60);
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function publicJob(job) {
  return {
    id: job.id,
    content_id: job.content_id,
    account_id: job.account_id,
    board_id: job.board_id,
    title: job.snapshot?.title || '',
    image_url: job.snapshot?.image_url || '',
    destination_url: job.snapshot?.destination_url || '',
    planned_at: job.planned_at,
    next_attempt_at: job.next_attempt_at || null,
    status: job.status,
    attempts: Number(job.attempts) || 0,
    max_attempts: Number(job.max_attempts) || 1,
    pin_id: job.pin_id || null,
    published_at: job.published_at || null,
    error_code: job.error_code || null,
    error_message: job.error_message || null,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!getKv(env)) return json({ ok:false, error:'storage_not_configured' },503);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    const job = await getQueueJob(env,id);
    return job ? json({ ok:true, item:publicJob(job) }) : json({ ok:false, error:'queue_job_not_found' },404);
  }

  const accountId = cleanText(url.searchParams.get('account_id'),100);
  const status = cleanText(url.searchParams.get('status'),30);
  let items = await listQueue(env);
  if (accountId) items = items.filter(x => x.account_id === accountId);
  if (status) items = items.filter(x => x.status === status);
  items.sort((a,b) => String(a.planned_at||'').localeCompare(String(b.planned_at||'')));
  return json({ ok:true, items:items.map(publicJob) });
}

export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok:false, error:'bad_json' },400); }

  const contentId = cleanText(body?.content_id,100);
  const content = await getContent(env,contentId);
  if (!content) return json({ ok:false, error:'content_not_found' },404);
  if (content.status === 'published') return json({ ok:false, error:'content_already_published' },409);

  const account = await getAccount(env,content.account_id);
  if (!account) return json({ ok:false, error:'account_not_found' },404);

  const boardId = cleanText(body?.board_id || content.board_id,32);
  if (!/^\d+$/.test(boardId)) return json({ ok:false, error:'board_required' },400);

  const plannedAt = parseIso(body?.planned_at) || new Date().toISOString();
  const now = new Date().toISOString();

  const existing = (await listQueue(env)).find(x =>
    x.content_id === content.id &&
    ['queued','retry','processing','needs_review'].includes(x.status)
  );
  if (existing) return json({ ok:false, error:'content_already_queued', job:publicJob(existing) },409);

  const job = {
    id: makeQueueId(),
    content_id: content.id,
    account_id: content.account_id,
    board_id: boardId,
    environment: account.environment,
    planned_at: plannedAt,
    next_attempt_at: plannedAt,
    status: 'queued',
    attempts: 0,
    max_attempts: 3,
    pin_id: null,
    published_at: null,
    error_code: null,
    error_message: null,
    snapshot: {
      title: content.title,
      description: content.description || '',
      alt_text: content.alt_text || content.title,
      destination_url: content.destination_url || '',
      image_url: content.image_url,
      topic: content.topic || '',
    },
    created_at: now,
    updated_at: now,
  };

  await saveQueueJob(env,job);
  content.board_id = boardId;
  content.status = 'queued';
  content.updated_at = now;
  await saveContent(env,content);

  return json({ ok:true, item:publicJob(job) },201);
}

export async function onRequestPatch({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get('id') || '';
  const job = await getQueueJob(env,id);
  if (!job) return json({ ok:false, error:'queue_job_not_found' },404);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok:false, error:'bad_json' },400); }

  const action = cleanText(body?.action,30);
  const now = new Date().toISOString();

  if (action === 'cancel') {
    if (!MUTABLE.has(job.status)) return json({ ok:false, error:'job_not_cancelable' },409);
    job.status = 'canceled';
    job.updated_at = now;
    await saveQueueJob(env,job);

    const content = await getContent(env,job.content_id);
    if (content && content.status === 'queued') {
      content.status = 'approved';
      content.updated_at = now;
      await saveContent(env,content);
    }
    return json({ ok:true, item:publicJob(job) });
  }

  if (action === 'reschedule') {
    if (!MUTABLE.has(job.status)) return json({ ok:false, error:'job_not_reschedulable' },409);
    const plannedAt = parseIso(body?.planned_at);
    if (!plannedAt) return json({ ok:false, error:'invalid_planned_at' },400);
    job.planned_at = plannedAt;
    job.next_attempt_at = plannedAt;
    job.status = 'queued';
    job.updated_at = now;
    await saveQueueJob(env,job);
    return json({ ok:true, item:publicJob(job) });
  }

  if (action === 'retry') {
    if (!['failed','needs_review'].includes(job.status)) return json({ ok:false, error:'job_not_retryable' },409);
    if (job.pin_id) return json({ ok:false, error:'published_job_locked' },409);
    job.status = 'queued';
    job.next_attempt_at = now;
    job.error_code = null;
    job.error_message = null;
    job.updated_at = now;
    await saveQueueJob(env,job);
    return json({ ok:true, item:publicJob(job) });
  }

  return json({ ok:false, error:'unsupported_action' },400);
}
