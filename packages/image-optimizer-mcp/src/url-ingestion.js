import { inspectImage, optimizeImage } from './image-core/index.js';
import { secureFetch } from './secure-fetch.js';

const DEFAULTS = Object.freeze({
  maxImages: 4,
  maxPageBytes: 2 * 1024 * 1024,
  maxImageBytes: 8 * 1024 * 1024,
  maxTotalImageBytes: 24 * 1024 * 1024,
  timeoutMs: 8000,
  maxRedirects: 3,
  concurrency: 2,
});

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function parseAttributes(tag) {
  const attrs = {};
  const re = /\b([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(re)) attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  return attrs;
}

function firstSrcsetUrl(srcset) {
  if (typeof srcset !== 'string' || !srcset.trim()) return null;
  const first = srcset.split(',')[0]?.trim();
  if (!first) return null;
  return first.split(/\s+/)[0] || null;
}

function positiveInt(value) {
  const number = Number.parseInt(value ?? '', 10);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function extractImageRefs(html, pageUrl, maxImages = DEFAULTS.maxImages) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  const limit = Math.max(1, Math.min(maxImages, 10));
  const refs = [];
  const seen = new Set();
  let imgTagCount = 0;

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    imgTagCount += 1;
    if (refs.length >= limit) continue;
    const attrs = parseAttributes(match[0]);
    const rawSrc = attrs.src || firstSrcsetUrl(attrs.srcset);
    if (!rawSrc) continue;

    let url;
    try {
      url = new URL(rawSrc, pageUrl);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol) || seen.has(url.href)) continue;
    seen.add(url.href);
    refs.push({
      url: url.href,
      src: attrs.src ?? null,
      srcset: attrs.srcset ?? null,
      sizes: attrs.sizes ?? null,
      widthAttr: positiveInt(attrs.width),
      heightAttr: positiveInt(attrs.height),
      loading: attrs.loading ?? null,
      fetchPriority: attrs.fetchpriority ?? null,
      altPresent: Object.prototype.hasOwnProperty.call(attrs, 'alt'),
    });
  }

  return { imgTagCount, refs };
}

async function mapBounded(items, concurrency, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, 3)) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      out[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

function contentType(headers) {
  const value = headers?.['content-type'];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function staticObservations(ref) {
  const observations = [];
  if (!(ref.widthAttr && ref.heightAttr)) observations.push('missing_width_height_attributes');
  if (!ref.srcset) observations.push('missing_srcset');
  if (ref.srcset && !ref.sizes) observations.push('missing_sizes');
  return observations;
}

export async function loadUrlImages(input, options = {}) {
  const cfg = { ...DEFAULTS, ...(options.limits ?? {}) };
  const maxImages = Math.max(1, Math.min(input.maxImages ?? cfg.maxImages, 10));
  const fetchImpl = options.fetchImpl ?? secureFetch;

  const page = await fetchImpl(input.url, {
    maxBytes: cfg.maxPageBytes,
    timeoutMs: cfg.timeoutMs,
    maxRedirects: cfg.maxRedirects,
    accept: 'text/html,application/xhtml+xml',
  });
  if (page.status < 200 || page.status >= 300) throw new Error(`page_http_${page.status}`);
  if (!/^(text\/html|application\/xhtml\+xml)\b/i.test(contentType(page.headers))) throw new Error('page_content_type_not_html');

  const html = new TextDecoder('utf-8', { fatal: false }).decode(page.body);
  const extracted = extractImageRefs(html, page.url, maxImages);
  let acceptedImageBytes = 0;

  const results = await mapBounded(extracted.refs, cfg.concurrency, async (ref) => {
    try {
      const response = await fetchImpl(ref.url, {
        maxBytes: cfg.maxImageBytes,
        timeoutMs: cfg.timeoutMs,
        maxRedirects: cfg.maxRedirects,
        accept: 'image/*',
      });
      if (response.status < 200 || response.status >= 300) return { status: 'SKIP', sourceUrl: ref.url, reason: `image_http_${response.status}`, html: ref };
      const mimeType = contentType(response.headers).split(';')[0].trim().toLowerCase();
      if (!mimeType.startsWith('image/')) return { status: 'SKIP', sourceUrl: ref.url, reason: 'image_content_type_invalid', html: ref };
      if (acceptedImageBytes + response.body.length > cfg.maxTotalImageBytes) return { status: 'SKIP', sourceUrl: ref.url, reason: 'total_image_byte_budget', html: ref };

      const metadata = await inspectImage(response.body, { policy: input.policy });
      acceptedImageBytes += response.body.length;
      return {
        status: 'FETCHED',
        sourceUrl: response.url,
        mimeType,
        redirects: response.redirects.length,
        html: ref,
        observations: staticObservations(ref),
        image: metadata,
        buffer: response.body,
      };
    } catch (error) {
      return { status: 'SKIP', sourceUrl: ref.url, reason: error?.code ?? error?.message ?? 'image_fetch_failed', html: ref };
    }
  });

  return {
    mode: 'http_fast',
    browserMetrics: false,
    page: {
      requestedUrl: input.url,
      finalUrl: page.url,
      httpStatus: page.status,
      bytes: page.body.length,
      redirects: page.redirects.length,
      imgTagCount: extracted.imgTagCount,
      selectedImageCount: extracted.refs.length,
    },
    images: results,
    fetched: results.filter((item) => item.status === 'FETCHED').length,
    skipped: results.filter((item) => item.status === 'SKIP').length,
    fetchedImageBytes: acceptedImageBytes,
  };
}

function withoutBuffers(value) {
  if (Array.isArray(value)) return value.map(withoutBuffers);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'buffer' && Buffer.isBuffer(item)) continue;
    out[key] = withoutBuffers(item);
  }
  return out;
}

export async function analyzeRemotePageImages(input, options = {}) {
  const loaded = await loadUrlImages(input, options);
  return {
    status: loaded.fetched > 0 ? 'OK' : 'NO_IMAGES',
    ...withoutBuffers(loaded),
    safetyNote: 'HTTP fast mode reports static image facts only; it does not claim rendered size, currentSrc, LCP, or browser-selected candidates.',
  };
}

export async function optimizeRemotePageImages(input, options = {}) {
  const loaded = await loadUrlImages(input, options);
  const results = [];

  for (const item of loaded.images) {
    if (item.status !== 'FETCHED') {
      results.push(withoutBuffers(item));
      continue;
    }
    const optimization = await optimizeImage(item.buffer, { policy: input.policy });
    results.push({
      sourceUrl: item.sourceUrl,
      mimeType: item.mimeType,
      html: item.html,
      observations: item.observations,
      original: item.image,
      optimization,
    });
  }

  const accepted = results.filter((item) => item.optimization?.status === 'ACCEPT').length;
  return {
    status: accepted > 0 ? 'ACCEPT' : 'REJECT',
    mode: 'http_fast_same_dimensions',
    browserMetrics: false,
    page: loaded.page,
    processed: results.filter((item) => item.optimization).length,
    accepted,
    results,
    safetyNote: 'URL mode never auto-resizes from HTML layout hints. It only recompresses at the original dimensions; browser-aware resize requires measured rendered facts or an explicit target.',
  };
}
