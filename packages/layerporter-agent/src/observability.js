import { createHash } from 'node:crypto';

const REDACT_KEYS = /(?:authorization|api[-_]?key|token|secret|cookie|password)/i;
const TEXT_KEYS = /(?:body|content|prompt|instructions|text)/i;

function hashText(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

export function sanitizeForLog(value, key = '') {
  if (REDACT_KEYS.test(key)) return '[REDACTED]';
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (TEXT_KEYS.test(key)) return { sha256: hashText(value), bytes: Buffer.byteLength(value, 'utf8') };
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeForLog(childValue, childKey)]));
  }
  return String(value);
}

export function makeRunRecord({ runId, phase, status, startedAt, finishedAt, counters = {}, error = null, metadata = {} }) {
  return sanitizeForLog({
    runId,
    phase,
    status,
    startedAt,
    finishedAt,
    elapsedMs: startedAt && finishedAt ? new Date(finishedAt).getTime() - new Date(startedAt).getTime() : null,
    counters,
    error: error ? { name: error.name, code: error.code, message: error.message } : null,
    metadata,
  });
}

export function appendRunLog(memory, record) {
  if (!memory.runLog) memory.runLog = [];
  memory.runLog.push(record);
  if (memory.runLog.length > 500) memory.runLog.splice(0, memory.runLog.length - 500);
  return record;
}
