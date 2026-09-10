import path from 'node:path';
import { sanitizeForText } from './text-result.js';

const MIME_BY_FORMAT = Object.freeze({
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
});

function safeStem(value) {
  if (typeof value !== 'string' || !value.trim()) return 'optimized-image';
  let raw = value.trim();
  try {
    raw = path.basename(new URL(raw).pathname) || raw;
  } catch {
    raw = path.basename(raw);
  }
  return (raw.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 72) || 'optimized-image');
}

function extensionFor(format) {
  if (format === 'jpeg' || format === 'jpg') return 'jpg';
  if (format === 'png' || format === 'webp' || format === 'avif') return format;
  return 'bin';
}

function artifactName(context, object) {
  const format = object.output?.format ?? object.outputFormat ?? context.format ?? null;
  const width = object.width ?? object.output?.width ?? context.width ?? null;
  const suffix = Number.isFinite(width) && width > 0 ? `${width}w` : 'optimized';
  return `${safeStem(context.source)}-${suffix}.${extensionFor(format)}`;
}

async function walk(value, store, links, context = {}) {
  if (Buffer.isBuffer(value)) return { type: 'binary', byteLength: value.byteLength };
  if (Array.isArray(value)) return Promise.all(value.map((item) => walk(item, store, links, context)));
  if (!value || typeof value !== 'object') return value;

  const nextContext = {
    source: value.sourceUrl ?? value.id ?? context.source,
    width: value.width ?? value.output?.width ?? context.width,
    format: value.output?.format ?? value.outputFormat ?? context.format,
  };
  const out = {};

  for (const [key, item] of Object.entries(value)) {
    if (key === 'buffer' && Buffer.isBuffer(item)) {
      if (value.status === 'ACCEPT') {
        const format = value.output?.format ?? value.outputFormat ?? nextContext.format;
        const mimeType = MIME_BY_FORMAT[format] ?? 'application/octet-stream';
        const artifact = await store.put(item, {
          name: artifactName(nextContext, value),
          mimeType,
        });
        out.artifact = artifact;
        links.push({
          type: 'resource_link',
          uri: artifact.uri,
          name: artifact.name,
          title: 'Optimized image artifact',
          description: `Verified temporary image output. SHA-256 ${artifact.sha256}.`,
          mimeType: artifact.mimeType,
          size: artifact.size,
        });
      } else {
        out.buffer = { type: 'binary', byteLength: item.byteLength };
      }
      continue;
    }
    out[key] = await walk(item, store, links, nextContext);
  }

  return out;
}

export async function artifactToolResult(value, store) {
  const links = [];
  const safeValue = await walk(value, store, links);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(sanitizeForText(safeValue)),
      },
      ...links,
    ],
  };
}
