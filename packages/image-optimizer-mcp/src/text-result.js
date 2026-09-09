function binarySummary(value) {
  return {
    type: 'binary',
    byteLength: value.byteLength,
  };
}

export function sanitizeForText(value, seen = new WeakSet()) {
  if (Buffer.isBuffer(value)) return binarySummary(value);

  if (ArrayBuffer.isView(value)) {
    return binarySummary(value);
  }

  if (value instanceof ArrayBuffer) {
    return { type: 'binary', byteLength: value.byteLength };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForText(item, seen));
  }

  if (!value || typeof value !== 'object') return value;

  // Defend against objects that already came through Buffer.toJSON().
  if (value.type === 'Buffer' && Array.isArray(value.data)) {
    return { type: 'binary', byteLength: value.data.length };
  }

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = sanitizeForText(item, seen);
  }

  seen.delete(value);
  return result;
}

export function textResult(value) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(sanitizeForText(value)),
    }],
  };
}
