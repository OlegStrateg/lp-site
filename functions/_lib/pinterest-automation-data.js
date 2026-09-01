const CONTENT_PREFIX = 'pa:content:';
const CONTENT_INDEX = 'pa:content:index';
const QUEUE_PREFIX = 'pa:queue:';
const QUEUE_INDEX = 'pa:queue:index';
const SETTINGS_KEY = 'pa:settings';
const WORKER_HEARTBEAT = 'pa:worker:heartbeat';

function kv(env) {
  return env.FEEDBACK_KV || null;
}

export function getKv(env) {
  return kv(env);
}

function randomId(prefix) {
  const data = crypto.getRandomValues(new Uint8Array(12));
  let binary = '';
  for (const b of data) binary += String.fromCharCode(b);
  return prefix + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function readIndex(env, key) {
  const store = kv(env);
  const raw = await store.get(key);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function writeIndex(env, key, ids) {
  await kv(env).put(key, JSON.stringify([...new Set(ids)]));
}

export function makeContentId() {
  return randomId('cnt_');
}

export function makeQueueId() {
  return randomId('job_');
}

export async function listContent(env) {
  const store = kv(env);
  const ids = await readIndex(env, CONTENT_INDEX);
  const rows = [];
  for (const id of ids) {
    const raw = await store.get(CONTENT_PREFIX + id);
    if (!raw) continue;
    try { rows.push(JSON.parse(raw)); } catch {}
  }
  return rows;
}

export async function getContent(env, id) {
  if (!/^cnt_[A-Za-z0-9_-]{8,80}$/.test(id || '')) return null;
  const raw = await kv(env).get(CONTENT_PREFIX + id);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function saveContent(env, item) {
  const store = kv(env);
  await store.put(CONTENT_PREFIX + item.id, JSON.stringify(item));
  const ids = await readIndex(env, CONTENT_INDEX);
  if (!ids.includes(item.id)) {
    ids.unshift(item.id);
    await writeIndex(env, CONTENT_INDEX, ids);
  }
}

export async function deleteContent(env, id) {
  const store = kv(env);
  await store.delete(CONTENT_PREFIX + id);
  const ids = (await readIndex(env, CONTENT_INDEX)).filter(x => x !== id);
  await writeIndex(env, CONTENT_INDEX, ids);
}

export async function listQueue(env) {
  const store = kv(env);
  const ids = await readIndex(env, QUEUE_INDEX);
  const rows = [];
  for (const id of ids) {
    const raw = await store.get(QUEUE_PREFIX + id);
    if (!raw) continue;
    try { rows.push(JSON.parse(raw)); } catch {}
  }
  return rows;
}

export async function getQueueJob(env, id) {
  if (!/^job_[A-Za-z0-9_-]{8,80}$/.test(id || '')) return null;
  const raw = await kv(env).get(QUEUE_PREFIX + id);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function saveQueueJob(env, job) {
  const store = kv(env);
  await store.put(QUEUE_PREFIX + job.id, JSON.stringify(job));
  const ids = await readIndex(env, QUEUE_INDEX);
  if (!ids.includes(job.id)) {
    ids.unshift(job.id);
    await writeIndex(env, QUEUE_INDEX, ids);
  }
}

export async function deleteQueueJob(env, id) {
  const store = kv(env);
  await store.delete(QUEUE_PREFIX + id);
  const ids = (await readIndex(env, QUEUE_INDEX)).filter(x => x !== id);
  await writeIndex(env, QUEUE_INDEX, ids);
}

export const DEFAULT_SETTINGS = {
  daily_limit: 5,
  approval_mode: 'manual',
  primary_format: 'vertical_pin',
  production_live: false,
  sandbox_auto_publish: true,
};

export async function getSettings(env) {
  const raw = await kv(env).get(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw), production_live: false };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(env, settings) {
  const clean = { ...DEFAULT_SETTINGS, ...settings, production_live: false };
  await kv(env).put(SETTINGS_KEY, JSON.stringify(clean));
  return clean;
}

export async function getWorkerHeartbeat(env) {
  const raw = await kv(env).get(WORKER_HEARTBEAT);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
