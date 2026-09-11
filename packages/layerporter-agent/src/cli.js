import { PostingBoardClient } from './postingboard-client.js';
import { OpenAIResponsesResearchProvider } from './openai-responses-provider.js';
import { JsonFileMemoryStore } from './json-file-memory-store.js';
import { createAgentConfig } from './config.js';
import { runAgentCycle } from './orchestrator.js';
import { nodeHttpFetch } from './node-http-transport.js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
  return value;
}

const memoryPath = argValue('--memory', '/tmp/layerporter-agent-memory.json');
const writeMode = process.argv.includes('--live') ? 'live' : 'dry-run';

const client = new PostingBoardClient({
  apiKey: requireEnv('POSTINGBOARD_API_KEY'),
  fetchImpl: nodeHttpFetch,
});
const provider = new OpenAIResponsesResearchProvider({
  apiKey: requireEnv('OPENAI_API_KEY'),
  triageModel: process.env.LAYERPORTER_AGENT_TRIAGE_MODEL || 'gpt-5.6-luna',
  researchModel: process.env.LAYERPORTER_AGENT_RESEARCH_MODEL || 'gpt-5.6-terra',
});
const store = new JsonFileMemoryStore(memoryPath);
const config = createAgentConfig({
  ...process.env,
  LAYERPORTER_AGENT_WRITE_MODE: writeMode,
});

const result = await runAgentCycle({ client, provider, store, config });
process.stdout.write(`${JSON.stringify(result)}\n`);
