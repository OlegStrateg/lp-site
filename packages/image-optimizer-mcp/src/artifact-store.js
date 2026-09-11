import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ARTIFACT_SCHEME = 'layerporter-artifact:';
const ARTIFACT_HOST = 'artifact';
const ID_RE = /^[a-f0-9]{32}$/;

const EXT_BY_MIME = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
});

function artifactError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function safeName(value, mimeType) {
  const fallback = `optimized-image${EXT_BY_MIME[mimeType] ?? '.bin'}`;
  const raw = typeof value === 'string' && value.trim() ? path.basename(value.trim()) : fallback;
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96) || fallback;
  if (path.extname(cleaned)) return cleaned;
  return `${cleaned}${EXT_BY_MIME[mimeType] ?? '.bin'}`;
}

export function parseArtifactId(value) {
  if (typeof value !== 'string' || !value.trim()) throw artifactError('INVALID_ARTIFACT_ID', 'artifact id is required');
  let id = value.trim();
  if (id.startsWith(`${ARTIFACT_SCHEME}//`)) {
    const url = new URL(id);
    if (url.protocol !== ARTIFACT_SCHEME || url.hostname !== ARTIFACT_HOST) {
      throw artifactError('INVALID_ARTIFACT_URI', 'unsupported artifact URI');
    }
    id = url.pathname.replace(/^\/+/, '');
  }
  if (!ID_RE.test(id)) throw artifactError('INVALID_ARTIFACT_ID', 'invalid artifact id');
  return id;
}

export class ArtifactStore {
  constructor(options = {}) {
    this.rootDir = options.rootDir ?? path.join(os.tmpdir(), 'layerporter-image-optimizer-artifacts');
    this.ttlMs = options.ttlMs ?? 30 * 60 * 1000;
    this.maxArtifacts = options.maxArtifacts ?? 50;
    this.maxTotalBytes = options.maxTotalBytes ?? 50 * 1024 * 1024;
    this.maxArtifactBytes = options.maxArtifactBytes ?? 10 * 1024 * 1024;
    this.records = new Map();
    this.totalBytes = 0;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await fs.mkdir(this.rootDir, { recursive: true, mode: 0o700 });
    const now = Date.now();
    for (const entry of await fs.readdir(this.rootDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const filePath = path.join(this.rootDir, entry.name);
      try {
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs > this.ttlMs) await fs.unlink(filePath);
      } catch {
        // Best-effort cleanup only. Unknown files are never exposed through the in-memory index.
      }
    }
    this.initialized = true;
  }

  async cleanupExpired(now = Date.now()) {
    for (const [id, record] of this.records) {
      if (record.expiresAtMs > now) continue;
      this.records.delete(id);
      this.totalBytes -= record.size;
      await fs.unlink(record.filePath).catch(() => {});
    }
  }

  async put(buffer, options = {}) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw artifactError('INVALID_ARTIFACT', 'artifact must be a non-empty Buffer');
    if (buffer.length > this.maxArtifactBytes) throw artifactError('ARTIFACT_TOO_LARGE', 'artifact exceeds per-file byte limit');

    await this.init();
    await this.cleanupExpired();
    if (this.records.size >= this.maxArtifacts) throw artifactError('ARTIFACT_STORE_FULL', 'artifact count limit reached');
    if (this.totalBytes + buffer.length > this.maxTotalBytes) throw artifactError('ARTIFACT_STORE_FULL', 'artifact byte budget reached');

    const id = crypto.randomUUID().replaceAll('-', '');
    const mimeType = options.mimeType ?? 'application/octet-stream';
    const name = safeName(options.name, mimeType);
    const filePath = path.join(this.rootDir, `${id}-${name}`);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const createdAtMs = Date.now();
    const expiresAtMs = createdAtMs + this.ttlMs;

    await fs.writeFile(filePath, buffer, { flag: 'wx', mode: 0o600 });

    const record = {
      id,
      name,
      mimeType,
      size: buffer.length,
      sha256,
      filePath,
      createdAtMs,
      expiresAtMs,
    };
    this.records.set(id, record);
    this.totalBytes += record.size;
    return this.publicMetadata(record);
  }

  publicMetadata(record) {
    return {
      id: record.id,
      uri: `${ARTIFACT_SCHEME}//${ARTIFACT_HOST}/${record.id}`,
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      sha256: record.sha256,
      expiresAt: new Date(record.expiresAtMs).toISOString(),
    };
  }

  async read(idOrUri) {
    await this.init();
    await this.cleanupExpired();
    const id = parseArtifactId(idOrUri);
    const record = this.records.get(id);
    if (!record) throw artifactError('ARTIFACT_NOT_FOUND', 'artifact is missing or expired');
    if (record.expiresAtMs <= Date.now()) {
      await this.cleanupExpired();
      throw artifactError('ARTIFACT_EXPIRED', 'artifact expired');
    }

    const buffer = await fs.readFile(record.filePath);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    if (buffer.length !== record.size || sha256 !== record.sha256) {
      throw artifactError('ARTIFACT_INTEGRITY_FAILED', 'artifact integrity verification failed');
    }
    return { ...this.publicMetadata(record), buffer };
  }

  async dispose() {
    for (const record of this.records.values()) await fs.unlink(record.filePath).catch(() => {});
    this.records.clear();
    this.totalBytes = 0;
  }
}
