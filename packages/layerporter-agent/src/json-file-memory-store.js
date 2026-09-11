import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createEmptyMemory, validateMemory } from './memory-schema.js';

export class JsonFileMemoryStore {
  constructor(path) {
    if (!path) throw new TypeError('memory file path is required');
    this.path = path;
  }

  async load() {
    try {
      const raw = await readFile(this.path, 'utf8');
      return validateMemory(JSON.parse(raw));
    } catch (error) {
      if (error.code === 'ENOENT') return createEmptyMemory();
      throw error;
    }
  }

  async save(memory) {
    validateMemory(memory);
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, `${JSON.stringify(memory, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(tmp, this.path);
  }

  async update(mutator) {
    const memory = await this.load();
    const result = await mutator(memory);
    await this.save(memory);
    return result;
  }
}

export function assertPersistentStore(store) {
  if (!store || typeof store.load !== 'function' || typeof store.save !== 'function' || typeof store.update !== 'function') {
    throw new TypeError('Persistent store must implement load(), save(), update()');
  }
  return store;
}
