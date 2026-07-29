// One-shot file handoff between the home universal dropzone and a converter
// page. The dropzone puts the picked File into IndexedDB right before
// navigating; the destination widget takes it on load and runs it through its
// normal handleFile path (so every guardrail — magic bytes, size, dimensions —
// still applies exactly as if the user had dropped the file there).
//
// Privacy: IndexedDB is same-origin, on-device storage — nothing leaves the
// browser. The record is deleted on FIRST read (matching or not) and expires
// after 2 minutes, so a stale file never silently converts later.

const DB_NAME = 'layerporter';
const STORE = 'handoff';
const KEY = 'pending';
const MAX_AGE_MS = 2 * 60 * 1000;

interface HandoffRecord {
  file: File;
  ts: number;
  format: string; // DetectedFormat from fileRouter.ts
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putHandoff(file: File, format: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const record: HandoffRecord = { file, ts: Date.now(), format };
      tx.objectStore(STORE).put(record, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// Returns the pending file if it is younger than 2 minutes AND its detected
// format is one this widget accepts; otherwise null. Either way the record
// is deleted — a handoff is consumed exactly once.
export async function takeHandoff(acceptFormats: string[]): Promise<File | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openDb();
    try {
      const record = await new Promise<HandoffRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const getReq = store.get(KEY);
        store.delete(KEY); // consume unconditionally
        getReq.onsuccess = () => resolve(getReq.result as HandoffRecord | undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      if (!record || !(record.file instanceof File) || typeof record.ts !== 'number') return null;
      if (Date.now() - record.ts > MAX_AGE_MS) return null;
      if (!acceptFormats.includes(record.format)) return null;
      return record.file;
    } finally {
      db.close();
    }
  } catch {
    return null; // storage unavailable (private mode etc.) — dropzone handoff simply doesn't happen
  }
}
