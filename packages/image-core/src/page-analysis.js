const DEFAULTS = Object.freeze({
  oversizeRatioWarn: 1.5,
  oversizeRatioHigh: 2,
  minRenderedPixels: 16,
});

function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeUrl(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function confidenceFromEvidence(evidenceCount, max = 6) {
  return Number(clamp(evidenceCount / max, 0.25, 1).toFixed(2));
}

export function analyzeImageUsage(image, options = {}) {
  if (!image || typeof image !== 'object') throw new TypeError('image facts are required');

  const cfg = { ...DEFAULTS, ...options };
  const intrinsicWidth = Number(image.intrinsicWidth ?? 0);
  const intrinsicHeight = Number(image.intrinsicHeight ?? 0);
  const renderedWidth = Number(image.renderedWidth ?? 0);
  const renderedHeight = Number(image.renderedHeight ?? 0);
  const dpr = finitePositive(Number(image.devicePixelRatio)) ? Number(image.devicePixelRatio) : 1;

  const hasDimensions = [intrinsicWidth, intrinsicHeight, renderedWidth, renderedHeight].every(finitePositive);
  const requiredWidth = hasDimensions ? renderedWidth * dpr : null;
  const requiredHeight = hasDimensions ? renderedHeight * dpr : null;
  const widthRatio = hasDimensions ? intrinsicWidth / requiredWidth : null;
  const heightRatio = hasDimensions ? intrinsicHeight / requiredHeight : null;
  const oversizeRatio = hasDimensions ? Number(Math.max(widthRatio, heightRatio).toFixed(2)) : null;

  const src = normalizeUrl(image.currentSrc ?? image.src);
  const format = typeof image.format === 'string' ? image.format.toLowerCase() : null;
  const bytes = Number.isFinite(image.bytes) && image.bytes >= 0 ? image.bytes : null;
  const hasSrcset = typeof image.srcset === 'string' && image.srcset.trim().length > 0;
  const hasSizes = typeof image.sizes === 'string' && image.sizes.trim().length > 0;
  const loading = typeof image.loading === 'string' ? image.loading.toLowerCase() : null;
  const fetchPriority = typeof image.fetchPriority === 'string' ? image.fetchPriority.toLowerCase() : null;
  const widthAttr = Number(image.widthAttr ?? 0);
  const heightAttr = Number(image.heightAttr ?? 0);
  const hasDimensionAttrs = finitePositive(widthAttr) && finitePositive(heightAttr);

  const evidence = [];
  if (src) evidence.push({ type: 'url', value: src });
  if (hasDimensions) evidence.push({ type: 'dimensions', intrinsic: [intrinsicWidth, intrinsicHeight], rendered: [renderedWidth, renderedHeight], dpr });
  if (bytes !== null) evidence.push({ type: 'bytes', value: bytes });
  if (format) evidence.push({ type: 'format', value: format });
  if (image.lcp === true) evidence.push({ type: 'lcp', value: 'confirmed' });
  else if (image.hero === true) evidence.push({ type: 'hero', value: 'page-marked' });

  let role = 'content';
  let roleConfidence = 0.5;
  if (image.lcp === true) {
    role = 'lcp';
    roleConfidence = 1;
  } else if (image.hero === true) {
    role = 'hero_candidate';
    roleConfidence = 0.75;
  } else if (image.decorative === true) {
    role = 'decorative';
    roleConfidence = 0.9;
  }

  const findings = [];
  const findingBase = {
    category: 'image',
    imageUrl: src,
    evidence,
    confidence: confidenceFromEvidence(evidence.length),
  };

  if (oversizeRatio !== null && oversizeRatio >= cfg.oversizeRatioWarn) {
    findings.push({
      ...findingBase,
      id: 'oversized_image',
      severity: oversizeRatio >= cfg.oversizeRatioHigh ? 'high' : 'medium',
      impact: oversizeRatio >= cfg.oversizeRatioHigh ? 'high' : 'medium',
      currentState: { intrinsicWidth, intrinsicHeight, renderedWidth, renderedHeight, dpr, oversizeRatio },
      expectedState: { maxWidth: Math.ceil(requiredWidth), maxHeight: Math.ceil(requiredHeight) },
      risk: 'low',
      autoFixability: 'SAFE',
      suggestedFix: 'resize_or_generate_responsive_variant',
      verificationMethod: 'dimensions_and_bytes_before_after',
    });
  }

  if (!hasSrcset && hasDimensions && renderedWidth >= cfg.minRenderedPixels) {
    findings.push({
      ...findingBase,
      id: 'missing_srcset',
      severity: oversizeRatio !== null && oversizeRatio >= cfg.oversizeRatioWarn ? 'medium' : 'low',
      impact: 'medium',
      currentState: { srcset: null, sizes: hasSizes ? image.sizes : null },
      expectedState: { responsiveVariants: true },
      risk: 'low',
      autoFixability: 'SAFE',
      suggestedFix: 'generate_responsive_variants',
      verificationMethod: 'responsive_markup_and_network_bytes',
    });
  }

  if (hasSrcset && !hasSizes) {
    findings.push({
      ...findingBase,
      id: 'missing_sizes',
      severity: 'low',
      impact: 'medium',
      currentState: { srcset: image.srcset, sizes: null },
      expectedState: { sizes: 'context_derived' },
      risk: 'review',
      autoFixability: 'REVIEW',
      suggestedFix: 'derive_sizes_from_layout_context',
      verificationMethod: 'viewport_candidate_selection',
    });
  }

  if (!hasDimensionAttrs && hasDimensions) {
    findings.push({
      ...findingBase,
      id: 'missing_dimension_attributes',
      severity: 'low',
      impact: 'medium',
      currentState: { widthAttr: widthAttr || null, heightAttr: heightAttr || null },
      expectedState: { width: intrinsicWidth, height: intrinsicHeight },
      risk: 'low',
      autoFixability: 'SAFE',
      suggestedFix: 'add_width_height_attributes',
      verificationMethod: 'dom_attributes_and_cls_regression',
    });
  }

  if (role === 'lcp' && loading === 'lazy') {
    findings.push({
      ...findingBase,
      id: 'lcp_lazy_loaded',
      severity: 'high',
      impact: 'high',
      currentState: { loading, fetchPriority },
      expectedState: { loading: 'eager_or_default', fetchPriority: 'high_when_confirmed' },
      risk: 'low',
      autoFixability: 'SAFE',
      suggestedFix: 'remove_lazy_from_confirmed_lcp',
      verificationMethod: 'lcp_resource_timing_before_after',
    });
  }

  if (role === 'lcp' && fetchPriority !== 'high') {
    findings.push({
      ...findingBase,
      id: 'lcp_missing_fetchpriority',
      severity: 'medium',
      impact: 'medium',
      currentState: { fetchPriority: fetchPriority || null },
      expectedState: { fetchPriority: 'high' },
      risk: 'low',
      autoFixability: 'SAFE',
      suggestedFix: 'set_fetchpriority_high',
      verificationMethod: 'resource_priority_and_lcp_before_after',
    });
  }

  return {
    src,
    format,
    bytes,
    intrinsic: hasDimensions ? { width: intrinsicWidth, height: intrinsicHeight } : null,
    rendered: hasDimensions ? { width: renderedWidth, height: renderedHeight, dpr } : null,
    required: hasDimensions ? { width: Math.ceil(requiredWidth), height: Math.ceil(requiredHeight) } : null,
    oversizeRatio,
    responsive: { hasSrcset, hasSizes, srcset: hasSrcset ? image.srcset : null, sizes: hasSizes ? image.sizes : null },
    loading: { loading, fetchPriority },
    attributes: { width: widthAttr || null, height: heightAttr || null, complete: hasDimensionAttrs },
    role: { value: role, confidence: roleConfidence },
    findings,
  };
}

export function analyzePageImages(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('page snapshot is required');
  if (!Array.isArray(snapshot.images)) throw new TypeError('page snapshot.images must be an array');

  const pageUrl = normalizeUrl(snapshot.pageUrl);
  const images = snapshot.images.map((image, index) => ({ index, ...analyzeImageUsage(image, options) }));
  const findings = images.flatMap((item) => item.findings.map((finding) => ({ ...finding, pageUrl, imageIndex: item.index })));

  const priority = { high: 3, medium: 2, low: 1 };
  findings.sort((a, b) => (priority[b.severity] ?? 0) - (priority[a.severity] ?? 0));

  return {
    pageUrl,
    imageCount: images.length,
    findingsCount: findings.length,
    images,
    findings,
  };
}
