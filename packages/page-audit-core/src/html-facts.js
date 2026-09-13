function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(value) {
  return decodeEntities(String(value ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseAttrs(source = '') {
  const attrs = {};
  const re = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = re.exec(source))) {
    const name = match[1].toLowerCase();
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function firstMatch(html, regex) {
  const match = regex.exec(html);
  return match ? stripTags(match[1]) : '';
}

function allTagFacts(html, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let match;
  while ((match = re.exec(html))) {
    out.push({ attrs: parseAttrs(match[1]), text: stripTags(match[2]), raw: match[0] });
  }
  return out;
}

function allVoidFacts(html, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
  let match;
  while ((match = re.exec(html))) out.push({ attrs: parseAttrs(match[1]), raw: match[0] });
  return out;
}

function normalizeUrl(value, pageUrl) {
  if (!value) return null;
  try {
    return new URL(value, pageUrl).toString();
  } catch {
    return null;
  }
}

export function extractPageFacts({ url, html, status = 200, headers = {} }) {
  if (!url) throw new Error('url is required');
  if (typeof html !== 'string') throw new Error('html must be a string');

  const scripts = allTagFacts(html, 'script');
  const stylesRemoved = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ');
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(stylesRemoved);
  const visibleText = stripTags(bodyMatch?.[1] ?? stylesRemoved);

  const metas = allVoidFacts(html, 'meta').map((item) => item.attrs);
  const links = allVoidFacts(html, 'link').map((item) => item.attrs);
  const anchors = allTagFacts(html, 'a').map((item) => ({
    href: item.attrs.href ?? '',
    absoluteHref: normalizeUrl(item.attrs.href, url),
    text: item.text,
    download: Object.prototype.hasOwnProperty.call(item.attrs, 'download'),
  }));
  const images = allVoidFacts(html, 'img').map((item, index) => ({
    index,
    src: item.attrs.src ?? '',
    absoluteSrc: normalizeUrl(item.attrs.src, url),
    altPresent: Object.prototype.hasOwnProperty.call(item.attrs, 'alt'),
    alt: item.attrs.alt ?? null,
    width: item.attrs.width ?? null,
    height: item.attrs.height ?? null,
    loading: item.attrs.loading ?? null,
    fetchpriority: item.attrs.fetchpriority ?? null,
    srcset: item.attrs.srcset ?? null,
    sizes: item.attrs.sizes ?? null,
  }));
  const inputs = allVoidFacts(html, 'input').map((item) => item.attrs);
  const buttons = allTagFacts(html, 'button').map((item) => ({ text: item.text, type: item.attrs.type ?? null, id: item.attrs.id ?? null }));
  const forms = allTagFacts(html, 'form').map((item) => ({ action: item.attrs.action ?? null, method: item.attrs.method ?? null }));
  const h1 = allTagFacts(html, 'h1').map((item) => item.text).filter(Boolean);
  const h2 = allTagFacts(html, 'h2').map((item) => item.text).filter(Boolean);
  const h3 = allTagFacts(html, 'h3').map((item) => item.text).filter(Boolean);
  const paragraphs = allTagFacts(html, 'p').map((item) => item.text).filter(Boolean);

  const jsonLd = [];
  for (const script of scripts) {
    if ((script.attrs.type ?? '').toLowerCase() !== 'application/ld+json') continue;
    const rawMatch = /<script\b[^>]*>([\s\S]*?)<\/script>/i.exec(script.raw);
    const raw = rawMatch?.[1]?.trim() ?? '';
    try {
      jsonLd.push({ valid: true, value: JSON.parse(raw), raw });
    } catch (error) {
      jsonLd.push({ valid: false, error: error instanceof Error ? error.message : String(error), raw });
    }
  }

  const title = firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMeta = metas.find((meta) => (meta.name ?? '').toLowerCase() === 'description');
  const robotsMeta = metas.find((meta) => (meta.name ?? '').toLowerCase() === 'robots');
  const canonical = links.find((link) => (link.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  const lang = /<html\b([^>]*)>/i.exec(html);
  const htmlAttrs = parseAttrs(lang?.[1] ?? '');
  const wordCount = visibleText ? visibleText.split(/\s+/).filter(Boolean).length : 0;

  return {
    url,
    status,
    headers,
    title,
    metaDescription: descriptionMeta?.content ?? '',
    robots: robotsMeta?.content ?? '',
    canonical: normalizeUrl(canonical?.href, url),
    lang: htmlAttrs.lang ?? '',
    h1,
    h2,
    h3,
    paragraphs,
    anchors,
    images,
    inputs,
    buttons,
    forms,
    jsonLd,
    visibleText,
    wordCount,
    hasMain: /<main\b/i.test(html),
    hasDownloadControl: anchors.some((a) => a.download) || /\bdownload\b/i.test(visibleText),
    hasFileInput: inputs.some((input) => (input.type ?? '').toLowerCase() === 'file'),
  };
}

export const __test = { parseAttrs, stripTags, normalizeUrl };
