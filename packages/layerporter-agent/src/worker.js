import { executeAgentRuntime } from './runtime-execution.js';
import { isRuntimeVerificationRequestAllowed } from './runtime-verify-auth.js';

export default {
  async scheduled(event, env, ctx) {
    const task = executeAgentRuntime(env, { trigger: event?.cron || 'scheduled' });
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  },

  async fetch(request, env) {
    if (!(await isRuntimeVerificationRequestAllowed(request, env))) {
      return new Response('Not found', { status: 404 });
    }

    const heartbeat = await executeAgentRuntime(env, { trigger: 'http-verify' });
    return Response.json({
      ok: heartbeat.ok === true,
      writeMode: heartbeat.writeMode,
      result: heartbeat.result,
      error: heartbeat.error,
      startedAt: heartbeat.startedAt,
      finishedAt: heartbeat.finishedAt,
    }, {
      status: heartbeat.ok === true ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  },
};
