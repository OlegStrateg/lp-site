const MARKUP_SAFE_RULES = new Set(['missing_image_dimensions']);

function positiveInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function ratio(width, height) {
  return width > 0 && height > 0 ? width / height : null;
}

function ratioDelta(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(a - b) / a;
}

export function buildSafeMarkupFixPlan({ finding, image }) {
  if (!finding || !MARKUP_SAFE_RULES.has(finding.ruleId)) {
    return { status: 'REVIEW_REQUIRED', reason: 'finding is outside the safe markup allowlist' };
  }
  if (finding.confidence !== 'high') {
    return { status: 'REVIEW_REQUIRED', reason: 'high confidence is required' };
  }
  if (!image?.id) {
    return { status: 'REVIEW_REQUIRED', reason: 'stable snapshot image id is required' };
  }

  const intrinsicWidth = positiveInt(image.intrinsicWidth);
  const intrinsicHeight = positiveInt(image.intrinsicHeight);
  const renderedWidth = Number(image.renderedWidth || 0);
  const renderedHeight = Number(image.renderedHeight || 0);
  if (!intrinsicWidth || !intrinsicHeight || renderedWidth <= 0 || renderedHeight <= 0) {
    return { status: 'REVIEW_REQUIRED', reason: 'complete intrinsic and rendered dimensions are required' };
  }

  const intrinsicRatio = ratio(intrinsicWidth, intrinsicHeight);
  const renderedRatio = ratio(renderedWidth, renderedHeight);
  if (ratioDelta(intrinsicRatio, renderedRatio) > 0.03) {
    return { status: 'REVIEW_REQUIRED', reason: 'rendered aspect ratio differs from intrinsic ratio' };
  }

  const existingWidth = positiveInt(image.widthAttr);
  const existingHeight = positiveInt(image.heightAttr);
  if (image.widthAttr && !existingWidth) return { status: 'REVIEW_REQUIRED', reason: 'existing width attribute is not a positive integer' };
  if (image.heightAttr && !existingHeight) return { status: 'REVIEW_REQUIRED', reason: 'existing height attribute is not a positive integer' };
  if (existingWidth && existingHeight) return { status: 'NOOP', reason: 'both dimension attributes already exist' };

  let width = existingWidth;
  let height = existingHeight;
  if (!width && !height) {
    width = intrinsicWidth;
    height = intrinsicHeight;
  } else if (width && !height) {
    height = Math.max(1, Math.round(width / intrinsicRatio));
  } else if (!width && height) {
    width = Math.max(1, Math.round(height * intrinsicRatio));
  }

  return {
    status: 'PREVIEW_READY',
    ruleId: finding.ruleId,
    target: { imageId: image.id },
    patch: {
      type: 'set_attributes',
      attributes: { width: String(width), height: String(height) },
    },
    checks: {
      highConfidence: true,
      intrinsicDimensionsKnown: true,
      renderedAspectCompatible: true,
      productionWrite: false,
    },
  };
}

export function applyMarkupPatchToImageFacts(image, plan) {
  if (!image || !plan || plan.status !== 'PREVIEW_READY' || plan.patch?.type !== 'set_attributes') {
    throw new TypeError('PREVIEW_READY attribute patch required');
  }
  if (plan.target?.imageId !== image.id) throw new Error('patch target does not match image facts');
  return {
    ...image,
    widthAttr: plan.patch.attributes.width,
    heightAttr: plan.patch.attributes.height,
  };
}

export const SAFE_MARKUP_FIX_RULES = Object.freeze([...MARKUP_SAFE_RULES]);
