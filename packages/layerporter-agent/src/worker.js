import { PostingBoardClient } from './postingboard-client.js';
import { OpenAIResponsesResearchProvider } from './openai-responses-provider.js';
import { KvMemoryStore } from './kv-memory-store.js';
import { createAgentConfig } from './config.js';
import { runAgentCycle } from './orchestrator.js';
import { sanitizeForLog } from './observability.js';

const HEARTBEAT_KEY = 'layerporter-agent:heartbeat:v1';

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

export default {
  async scheduled(event, env, ctx) {
    const kv = requireEnv(env, 'LAYERPORTER_AGENT_KV');
    const startedAt = nowIso();
    const config = createAgentConfig(env);
    const heartbeat = {
      ok: true,
      startedAt,
      finishedAt: null,
      cron: event?.cron || null,
      writeMode: config.writeMode,
      requestedWriteMode: config.requestedWriteMode,
      liveHardStopAt: config.liveHardStopAt,
      result: null,
      error: null,
    };
    await writeHeartbeat(kv, heartbeat);

    const task = (async () => {
      try {
        const client = new PostingBoardClient({
          apiKey: requireEnv(env, 'POSTINGBOARD_API_KEY'),
        });
        const provider = new OpenAIResponsesResearchProvider({
          apiKey: requireEnv(env, 'OPENAI_API_KEY'),
          triageModel: env.LAYERPORTER_AGENT_TRIAGE_MODEL || 'gpt-5.6-luna',
          researchModel: env.LAYERPORTER_AGENT_RESEARCH_MODEL || 'gpt-5.6-terra',
        });
        const store = new KvMemoryStore(kv);
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
    })();

    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  },

  async fetch() {
    return new Response('Not found', { status: 404 });
  },
};
