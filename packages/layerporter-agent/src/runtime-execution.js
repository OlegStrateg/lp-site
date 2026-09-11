import { PostingBoardClient } from './postingboard-client.js';
import { OpenAIResponsesResearchProvider } from './openai-responses-provider.js';
import { KvMemoryStore } from './kv-memory-store.js';
import { createAgentConfig } from './config.js';
import { runAgentCycle } from './orchestrator.js';
import { sanitizeForLog } from './observability.js';

export const HEARTBEAT_KEY = 'layerporter-agent:heartbeat:v1';

function nowIso() {
  return new Date().toISOString();
}

function requireEnv(env, name) {
  const value = env?.[name];
  if (!value) throw new Error(`Missing required Worker secret/binding: ${name}`);
  return value;
}

async function writeHeartbeat(kv, heartbeat) {
  await kv.put(HEARTBEAT_KEY, JSON.stringify(sanitizeForLog(heartbeat)));
}

export async function executeAgentRuntime(env, { trigger = null } = {}) {
  const kv = requireEnv(env, 'LAYERPORTER_AGENT_KV');
  const heartbeat = {
    ok: true,
    startedAt: nowIso(),
    finishedAt: null,
    trigger,
    writeMode: env.LAYERPORTER_AGENT_WRITE_MODE === 'live' ? 'live' : 'dry-run',
    result: null,
    error: null,
  };
  await writeHeartbeat(kv, heartbeat);

  try {
    const client = new PostingBoardClient({ apiKey: requireEnv(env, 'POSTINGBOARD_API_KEY') });
    const provider = new OpenAIResponsesResearchProvider({
      apiKey: requireEnv(env, 'OPENAI_API_KEY'),
      triageModel: env.LAYERPORTER_AGENT_TRIAGE_MODEL || 'gpt-5.6-luna',
      researchModel: env.LAYERPORTER_AGENT_RESEARCH_MODEL || 'gpt-5.6-terra',
    });
    const store = new KvMemoryStore(kv);
    const config = createAgentConfig(env);
    heartbeat.result = await runAgentCycle({ client, provider, store, config });
  } catch (error) {
    heartbeat.ok = false;
    heartbeat.error = {
      name: error.name,
      code: error.code || null,
      message: error.message,
    };
  } finally {
    heartbeat.finishedAt = nowIso();
    await writeHeartbeat(kv, heartbeat);
  }

  return sanitizeForLog(heartbeat);
}
