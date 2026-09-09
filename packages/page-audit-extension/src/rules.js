const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };

function finding({ id, severity, title, fact, impact, fixability = 'review', verification }) {
  return { id, severity, title, fact, impact, fixability, verification };
}

export function runAuditRules(snapshot) {
  const findings = [];
  const seo = snapshot?.seo ?? {};
  const images = Array.isArray(snapshot?.images) ? snapshot.images : [];

  if (!seo.title) findings.push(finding({ id: 'missing_title', severity: 'high', title: 'Missing title', fact: 'Document title is empty.', impact: 'Search and browser context are weakened.', verification: 'Re-read document.title.' }));
  if (!seo.metaDescription) findings.push(finding({ id: 'missing_meta_description', severity: 'medium', title: 'Missing meta description', fact: 'No meta[name="description"] content found.', impact: 'Search snippet control is reduced.', verification: 'Re-read meta description.' }));
  if ((seo.h1Count ?? 0) === 0) findings.push(finding({ id: 'missing_h1', severity: 'high', title: 'Missing H1', fact: 'No H1 element found.', impact: 'Primary page topic is less explicit.', verification: 'Count H1 elements.' }));
  if ((seo.h1Count ?? 0) > 1) findings.push(finding({ id: 'multiple_h1', severity: 'medium', title: 'Multiple H1 elements', fact: `${seo.h1Count} H1 elements found.`, impact: 'Primary heading hierarchy is ambiguous.', verification: 'Count H1 elements.' }));
  if (!seo.canonical) findings.push(finding({ id: 'missing_canonical', severity: 'medium', title: 'Missing canonical', fact: 'No canonical link found.', impact: 'Canonical URL intent is not explicit.', verification: 'Re-read link[rel="canonical"].' }));
  if (seo.noindex) findings.push(finding({ id: 'noindex', severity: 'critical', title: 'Page is noindex', fact: 'Robots directives contain noindex.', impact: 'The page may be excluded from search indexing.', fixability: 'review', verification: 'Re-read robots meta directives.' }));

  for (const image of images) {
    const id = image.id || image.src || 'image';
    const renderedWidth = Number(image.renderedWidth || 0);
    const intrinsicWidth = Number(image.intrinsicWidth || 0);
    if (renderedWidth > 0 && intrinsicWidth > renderedWidth * 2) findings.push(finding({ id: `oversized_image:${id}`, severity: 'high', title: 'Oversized image', fact: `Intrinsic width ${intrinsicWidth}px vs rendered ${renderedWidth}px.`, impact: 'Excess image bytes may delay rendering and LCP.', fixability: 'safe-candidate', verification: 'Compare intrinsic and rendered dimensions after optimization.' }));
    if (!image.widthAttr || !image.heightAttr) findings.push(finding({ id: `missing_image_dimensions:${id}`, severity: 'medium', title: 'Image dimensions not declared', fact: 'width/height attributes are incomplete.', impact: 'Layout stability can be harder for the browser to reserve.', fixability: 'safe-candidate', verification: 'Re-read image width and height attributes.' }));
    if (!image.srcset && intrinsicWidth > 640) findings.push(finding({ id: `missing_srcset:${id}`, severity: 'medium', title: 'Responsive image candidates missing', fact: 'Large image has no srcset.', impact: 'Smaller viewports may download more pixels than necessary.', fixability: 'safe-candidate', verification: 'Re-read srcset and compare transferred bytes.' }));
    if (image.loading === 'lazy' && image.isLikelyHero) findings.push(finding({ id: `hero_lazy:${id}`, severity: 'high', title: 'Likely hero image is lazy-loaded', fact: 'A prominent above-the-fold image uses loading="lazy".', impact: 'Potential LCP delay. This is a heuristic until LCP is observed.', fixability: 'review', verification: 'Confirm actual LCP element in an independent performance run.' }));
  }

  return findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.id.localeCompare(b.id));
}
