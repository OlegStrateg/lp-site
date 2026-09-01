import { json, listAccounts, requireAdmin } from '../../../_lib/pinterest-automation-admin.js';
import { getWorkerHeartbeat, listContent, listQueue } from '../../../_lib/pinterest-automation-data.js';

function sameUtcDay(value, now = new Date()) {
  const d = new Date(value || 0);
  return Number.isFinite(d.getTime())
    && d.getUTCFullYear() === now.getUTCFullYear()
    && d.getUTCMonth() === now.getUTCMonth()
    && d.getUTCDate() === now.getUTCDate();
}

function publicQueue(job) {
  return {
    id:job.id,
    content_id:job.content_id,
    account_id:job.account_id,
    board_id:job.board_id,
    title:job.snapshot?.title || '',
    planned_at:job.planned_at,
    status:job.status,
    pin_id:job.pin_id || null,
    published_at:job.published_at || null,
    error_code:job.error_code || null,
  };
}

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const [content,queue,accounts,heartbeat] = await Promise.all([
    listContent(env),
    listQueue(env),
    listAccounts(env),
    getWorkerHeartbeat(env),
  ]);

  const now = new Date();
  const queued = queue.filter(x => ['queued','retry'].includes(x.status));
  const errors = queue.filter(x => ['failed','needs_review'].includes(x.status));
  const publishedToday = queue.filter(x => x.status === 'published' && sameUtcDay(x.published_at,now));
  const plannedToday = queue.filter(x => sameUtcDay(x.planned_at,now));
  const drafts = content.filter(x => x.status === 'draft');
  const approved = content.filter(x => x.status === 'approved');
  const next = [...queued].sort((a,b) => String(a.planned_at||'').localeCompare(String(b.planned_at||''))).slice(0,8);
  const lastPublished = [...queue]
    .filter(x => x.status === 'published')
    .sort((a,b) => String(b.published_at||'').localeCompare(String(a.published_at||'')))[0] || null;

  return json({
    ok:true,
    stats:{
      accounts:accounts.length,
      content_total:content.length,
      drafts:drafts.length,
      approved:approved.length,
      queue:queued.length,
      planned_today:plannedToday.length,
      published_today:publishedToday.length,
      needs_attention:errors.length,
    },
    next:next.map(publicQueue),
    last_published:lastPublished ? publicQueue(lastPublished) : null,
    worker:heartbeat,
  });
}
