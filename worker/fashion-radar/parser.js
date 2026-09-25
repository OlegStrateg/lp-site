import { FEEDS, RULES, VOGUE_YOUTUBE, googleTrendsUrl } from './data.js';

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripTags(value) {
  return decodeXml(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const rx = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i');
  const match = String(block || '').match(rx);
  return match ? stripTags(match[1]) : '';
}

function attrTag(block) {
  const match = String(block || '').match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? decodeXml(match[1]).trim() : '';
}

function normalize(value) {
  return stripTags(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function termMatch(text, term) {
  return (' ' + normalize(text) + ' ').includes(' ' + normalize(term) + ' ');
}

function isoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseFeed(xml, meta) {
  const items = String(xml || '').match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const entries = String(xml || '').match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const blocks = items.concat(entries).slice(0, 25);
  const rows = [];

  for (const block of blocks) {
    const title = tag(block, 'title');
    const description = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content');
    const link = tag(block, 'link') || attrTag(block);
    const published = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated');

    rows.push({
      source: meta.source,
      display_name: meta.display,
      market: meta.market,
      panel: meta.panel,
      title,
      text: [title, description].filter(Boolean).join(' — '),
      url: link || meta.url,
      published_at: isoDate(published),
      observed_at: new Date().toISOString(),
      kind: meta.kind || 'rss'
    });
  }

  return rows;
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'FashionRadar/0.1 (+https://radar.summarizers.app)' },
      signal: controller.signal,
      redirect: 'follow'
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function collectOne(meta) {
  const started = Date.now();
  try {
    const xml = await fetchText(meta.url, 7000);
    const rows = parseFeed(xml, meta);
    return {
      collector_id: meta.source,
      source: meta.source,
      display_name: meta.display,
      market: meta.market,
      status: 'ok',
      records: rows.length,
      elapsed_ms: Date.now() - started,
      rows
    };
  } catch (error) {
    return {
      collector_id: meta.source,
      source: meta.source,
      display_name: meta.display,
      market: meta.market,
      status: 'failed',
      records: 0,
      elapsed_ms: Date.now() - started,
      error: String(error && error.message ? error.message : error),
      rows: []
    };
  }
}

export async function collectAll(targetGeo) {
  const metas = FEEDS.map(function (row) {
    return {
      source: row[0],
      display: row[1],
      market: row[2],
      panel: row[3],
      url: row[4],
      kind: 'rss'
    };
  });

  metas.push({
    source: 'vogue_youtube',
    display: 'Vogue YouTube',
    market: 'GLOBAL',
    panel: 'trendsetter',
    url: VOGUE_YOUTUBE,
    kind: 'youtube'
  });

  const geos = Array.from(new Set(['US', 'GB', 'RU', targetGeo]));
  for (const geo of geos) {
    metas.push({
      source: 'google_trends_trending_now',
      display: 'Google Trends ' + geo,
      market: geo,
      panel: 'search_intent',
      url: googleTrendsUrl(geo),
      kind: 'google_trends'
    });
  }

  const batches = await Promise.all(metas.map(collectOne));
  const rows = batches.flatMap(function (item) { return item.rows; });
  return { batches, rows };
}

export function analyze(rows, targetGeo) {
  const candidates = [];

  for (const rule of RULES) {
    const matches = rows.filter(function (row) {
      return rule.terms.some(function (term) {
        return termMatch((row.title || '') + ' ' + (row.text || ''), term);
      });
    });

    if (!matches.length) continue;

    const unique = new Map();
    for (const match of matches) {
      const key = match.source + '|' + match.url + '|' + (match.published_at || match.title);
      if (!unique.has(key)) unique.set(key, match);
    }

    const evidence = Array.from(unique.values()).sort(function (a, b) {
      return String(b.published_at || b.observed_at).localeCompare(String(a.published_at || a.observed_at));
    });

    const sources = Array.from(new Set(evidence.map(function (row) { return row.source; })));
    const markets = Array.from(new Set(evidence.map(function (row) { return row.market; })));
    const panels = Array.from(new Set(evidence.map(function (row) { return row.panel; })));
    const targetEvidence = evidence.filter(function (row) { return row.market === targetGeo; });

    candidates.push({
      id: rule.id,
      label: rule.label,
      family: rule.family,
      state: sources.length >= 2 ? 'CONFIRMING' : 'DISCOVERED_PROXY',
      sources,
      markets,
      panels,
      independent_lines: sources.length,
      target_geo: targetGeo,
      target_observed: targetEvidence.length > 0,
      target_evidence_count: targetEvidence.length,
      evidence: evidence.slice(0, 20)
    });
  }

  candidates.sort(function (a, b) {
    return b.sources.length - a.sources.length ||
      b.evidence.length - a.evidence.length ||
      a.id.localeCompare(b.id);
  });

  return candidates;
}
