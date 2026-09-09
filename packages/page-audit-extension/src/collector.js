export function collectPageSnapshot() {
  const q = (selector) => document.querySelector(selector);
  const qa = (selector) => [...document.querySelectorAll(selector)];
  const robots = (q('meta[name="robots"]')?.content || '').toLowerCase();
  const viewportHeight = window.innerHeight || 0;

  const images = qa('img').slice(0, 200).map((img, index) => {
    const rect = img.getBoundingClientRect();
    return {
      id: `img-${index}`,
      src: img.currentSrc || img.src || '',
      alt: img.getAttribute('alt'),
      intrinsicWidth: img.naturalWidth || 0,
      intrinsicHeight: img.naturalHeight || 0,
      renderedWidth: Math.round(rect.width),
      renderedHeight: Math.round(rect.height),
      widthAttr: img.getAttribute('width'),
      heightAttr: img.getAttribute('height'),
      loading: img.getAttribute('loading') || '',
      fetchPriority: img.getAttribute('fetchpriority') || '',
      srcset: img.getAttribute('srcset') || '',
      sizes: img.getAttribute('sizes') || '',
      isLikelyHero: rect.top < Math.max(viewportHeight, 800) && rect.width >= Math.min(window.innerWidth * 0.5, 600) && rect.height >= 180,
    };
  });

  const resources = performance.getEntriesByType('resource').slice(0, 500).map((entry) => ({
    name: entry.name,
    initiatorType: entry.initiatorType,
    duration: Math.round(entry.duration),
    transferSize: entry.transferSize || 0,
    encodedBodySize: entry.encodedBodySize || 0,
  }));

  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    url: location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 },
    seo: {
      title: document.title.trim(),
      metaDescription: q('meta[name="description"]')?.content?.trim() || '',
      canonical: q('link[rel="canonical"]')?.href || '',
      h1Count: qa('h1').length,
      h1Text: qa('h1').slice(0, 5).map((el) => el.textContent?.trim() || ''),
      robots,
      noindex: /(?:^|[,\s])noindex(?:$|[,\s])/.test(robots),
    },
    images,
    resources,
    counts: {
      images: images.length,
      scripts: qa('script[src]').length,
      stylesheets: qa('link[rel="stylesheet"]').length,
      links: qa('a[href]').length,
    },
  };
}
