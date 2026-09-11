import { createEmptyMemory, validateMemory } from './memory-schema.js';

export class KvMemoryStore {
  constructor(kv, { key = 'layerporter-agent:memory:v1' } = {}) {
    if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') {
      throw new TypeError('Cloudflare KV binding with get/put is required');
    }
    this.kv = kv;
    this.key = key;
  }

  async load() {
    const raw = await this.kv.get(this.key);
    if (!raw) return createEmptyMemory();
    return validateMemory(JSON.parse(raw));
  }

  async save(memory) {
    validateMemory(memory);
    await this.kv.put(this.key, JSON.stringify(memory));
  }

  async update(mutator) {
    const memory = await this.load();
    const result = await mutator(memory);
    await this.save(memory);
    return result;
  }
}
