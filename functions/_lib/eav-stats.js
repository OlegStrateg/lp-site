export const EAV_PRODUCTION_START_DAY = '2026-09-14';

export async function eavStatsTotal(env) {
  const counts = {
    install: 0,
    install_landing: 0,
    install_organic: 0,
    uninstall: 0,
  };

  if (!env?.FEEDBACK_KV) return counts;

  let cursor;
  do {
    const page = await env.FEEDBACK_KV.list({ prefix: 'stats:eav:', cursor, limit: 1000 });
    for (const { name } of page.keys || []) {
      const parts = name.split(':');
      const date = parts[2] || '';
      const event = parts[3] || '';

      if (!date || date < EAV_PRODUCTION_START_DAY) continue;

      if (event === 'install') counts.install += 1;
      else if (event === 'install_landing') counts.install_landing += 1;
      else if (event === 'install_organic') counts.install_organic += 1;
      else if (event === 'uninstall') counts.uninstall += 1;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return counts;
}
