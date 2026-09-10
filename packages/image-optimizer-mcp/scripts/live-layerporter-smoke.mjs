import { TOOL_HANDLERS } from '../src/tools.js';

const ORIGIN = 'https://layerporter.com';
const PAGE = `${ORIGIN}/`;

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
}

const pageRes = await fetch(PAGE, {
  headers: {
    'user-agent': 'LayerPorter-Live-Smoke/1.0',
    'cache-control': 'no-cache',
  },
});
if (!pageRes.ok) throw new Error(`homepage fetch failed: ${pageRes.status}`);
const html = await pageRes.text();
const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? null;

const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
const imageFacts = imgTags.map((tag) => ({
  src: attr(tag, 'src'),
  srcset: attr(tag, 'srcset'),
  sizes: attr(tag, 'sizes'),
  width: attr(tag, 'width'),
  height: attr(tag, 'height'),
  loading: attr(tag, 'loading'),
  fetchpriority: attr(tag, 'fetchpriority'),
  alt: attr(tag, 'alt'),
}));

const liveHomeImages = [...new Set(imageFacts
  .map((x) => x.src)
  .filter((src) => typeof src === 'string' && /^\/images\/home\/.*\.webp$/i.test(src)))]
  .filter((src) => /-(?:640|960)\.webp$/i.test(src))
  .slice(0, 4);

if (liveHomeImages.length < 3) {
  throw new Error(`expected at least 3 live homepage WebP sources, got ${liveHomeImages.length}`);
}

const results = [];
let firstCandidate = null;
let firstOriginal = null;

for (const src of liveHomeImages) {
  const url = new URL(src, ORIGIN).href;
  const res = await fetch(url, { headers: { 'user-agent': 'LayerPorter-Live-Smoke/1.0', 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`image fetch failed ${res.status}: ${url}`);
  const original = Buffer.from(await res.arrayBuffer());

  const probe = await TOOL_HANDLERS.optimize_image({ buffer: original });
  const intrinsic = probe.original;
  const targetWidth = Math.max(1, Math.floor(intrinsic.width / 2));
  const optimized = await TOOL_HANDLERS.optimize_image({ buffer: original, target: { width: targetWidth } });

  if (optimized.status !== 'ACCEPT') {
    throw new Error(`expected resized live asset to ACCEPT: ${src} -> ${optimized.reason}`);
  }

  const compared = await TOOL_HANDLERS.compare_image_versions({
    original,
    candidate: optimized.buffer,
  });
  if (compared.status !== 'ACCEPT') {
    throw new Error(`compare rejected optimized live asset: ${src}`);
  }

  results.push({
    src,
    contentType: res.headers.get('content-type'),
    original: {
      bytes: intrinsic.bytes,
      format: intrinsic.format,
      width: intrinsic.width,
      height: intrinsic.height,
    },
    sameSizeProbe: {
      status: probe.status,
      reason: probe.reason,
      bytes: probe.output?.bytes ?? probe.original?.bytes ?? null,
      savingsBytes: probe.savingsBytes,
      savingsPercent: probe.savingsPercent,
    },
    resized: {
      status: optimized.status,
      reason: optimized.reason,
      targetWidth,
      output: optimized.output,
      savingsBytes: optimized.savingsBytes,
      savingsPercent: optimized.savingsPercent,
      compareStatus: compared.status,
    },
  });

  if (!firstCandidate) {
    firstOriginal = original;
    firstCandidate = optimized.buffer;
  }
}

const firstMeta = results[0].original;
const variantWidths = [...new Set([
  Math.max(1, Math.floor(firstMeta.width / 3)),
  Math.max(1, Math.floor(firstMeta.width / 2)),
])];
const variants = await TOOL_HANDLERS.generate_responsive_variants({
  buffer: firstOriginal,
  widths: variantWidths,
  maxVariants: variantWidths.length,
});
if (variants.status !== 'ACCEPT') throw new Error('responsive variants did not produce any accepted output');

const homepagePhotoTags = imageFacts.filter((x) => /^\/images\/home\/.*\.webp$/i.test(x.src ?? ''));
const report = {
  livePage: {
    url: PAGE,
    httpStatus: pageRes.status,
    title,
    imgTagCount: imageFacts.length,
    homepageWebpOccurrences: homepagePhotoTags.length,
    homepageWebpWithSrcset: homepagePhotoTags.filter((x) => x.srcset).length,
    homepageWebpWithSizes: homepagePhotoTags.filter((x) => x.sizes).length,
    homepageWebpWithWidthHeight: homepagePhotoTags.filter((x) => x.width && x.height).length,
    allImagesMissingWidthHeight: imageFacts.filter((x) => !x.width || !x.height).map((x) => x.src),
  },
  liveOptimization: results,
  responsiveVariantSmoke: {
    source: liveHomeImages[0],
    requestedWidths: variantWidths,
    status: variants.status,
    variants: variants.variants.map((v) => ({
      width: v.width,
      status: v.status,
      reason: v.reason,
      bytes: v.output?.bytes ?? null,
      outputWidth: v.output?.width ?? null,
      outputHeight: v.output?.height ?? null,
      savingsPercent: v.savingsPercent,
    })),
  },
  productTruth: {
    liveRemoteFetchWasPerformedBy: 'test harness, not MCP tool',
    mcpRemoteUrlIngestion: false,
    optimizedBinaryExistsInsideCore: Boolean(firstCandidate),
    optimizedBinaryReturnedThroughCurrentTextMcpResponse: false,
  },
};

console.log(JSON.stringify(report, null, 2));
