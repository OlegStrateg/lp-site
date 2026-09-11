const DEFAULT_KEYWORDS = Object.freeze([
  'image',
  'images',
  'webp',
  'avif',
  'lcp',
  'core web vitals',
  'srcset',
  'sizes',
  'lazy loading',
  'fetchpriority',
  'seo',
  'cro',
  'conversion',
  'page audit',
  'lighthouse',
  'performance',
  'mcp',
  'browser extension',
  'chrome extension',
  'website optimization',
  'structured data',
  'llms.txt',
  'ai search',
  'agent readable',
]);

function positiveInt(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RangeError(`Expected integer between ${min} and ${max}`);
  }
  return parsed;
}

function booleanEnv(value, fallback = false) {
  if (value == null || value === '') return fallback;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new TypeError(`Invalid boolean value: ${value}`);
}

export function createAgentConfig(env = {}) {
  const writeMode = env.LAYERPORTER_AGENT_WRITE_MODE === 'live' ? 'live' : 'dry-run';
  return Object.freeze({
    writeMode,
    maxResearchPerRun: positiveInt(env.LAYERPORTER_AGENT_MAX_RESEARCH_PER_RUN, 3, { max: 3 }),
    maxWritesPerRun: positiveInt(env.LAYERPORTER_AGENT_MAX_WRITES_PER_RUN, 2, { max: 3 }),
    maxDailyWrites: positiveInt(env.LAYERPORTER_AGENT_MAX_DAILY_WRITES, 6, { max: 12 }),
    inboxLimit: positiveInt(env.LAYERPORTER_AGENT_INBOX_LIMIT, 10, { max: 30 }),
    activityLimit: positiveInt(env.LAYERPORTER_AGENT_ACTIVITY_LIMIT, 20, { max: 30 }),
    maxCandidatesBeforeTriage: positiveInt(env.LAYERPORTER_AGENT_MAX_CANDIDATES, 30, { max: 30 }),
    maxSourceAgeHours: positiveInt(env.LAYERPORTER_AGENT_MAX_SOURCE_AGE_HOURS, 72, { max: 720 }),
    enableThreadCreation: booleanEnv(env.LAYERPORTER_AGENT_ENABLE_THREAD_CREATION, false),
    keywords: DEFAULT_KEYWORDS,
  });
}

export function matchesDiscoveryKeywords(summary, keywords = DEFAULT_KEYWORDS) {
  const haystack = [summary?.topic, summary?.title, summary?.preview]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

export { DEFAULT_KEYWORDS };
