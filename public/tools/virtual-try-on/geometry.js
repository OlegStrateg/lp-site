export function orderByScreenX(a, b) {
  return a.x <= b.x ? [a, b] : [b, a];
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function normalizeVector(x, y, fallback = { x: 0, y: 1 }) {
  const length = Math.hypot(x, y);
  if (length < 0.0001) return fallback;
  return { x: x / length, y: y / length };
}

function addPoint(point, vector, amount) {
  return { x: point.x + vector.x * amount, y: point.y + vector.y * amount };
}

export function affineFromTriangles(s0, s1, s2, d0, d1, d2) {
  const det = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(det) < 0.000001) return null;

  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / det;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / det;
  const e = (
    d0.x * (s1.x * s2.y - s2.x * s1.y) +
    d1.x * (s2.x * s0.y - s0.x * s2.y) +
    d2.x * (s0.x * s1.y - s1.x * s0.y)
  ) / det;

  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / det;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / det;
  const f = (
    d0.y * (s1.x * s2.y - s2.x * s1.y) +
    d1.y * (s2.x * s0.y - s0.x * s2.y) +
    d2.y * (s0.x * s1.y - s1.x * s0.y)
  ) / det;

  return { a, b, c, d, e, f };
}

export function applyAffine(transform, point) {
  return {
    x: transform.a * point.x + transform.c * point.y + transform.e,
    y: transform.b * point.x + transform.d * point.y + transform.f,
  };
}

export function buildTorsoGeometry({
  anatomicalLeftShoulder,
  anatomicalRightShoulder,
  anatomicalLeftHip,
  anatomicalRightHip,
  sourceAspect,
  fitScale = 1,
  xOffset = 0,
  yOffset = 0,
}) {
  const [screenLeftShoulder, screenRightShoulder] = orderByScreenX(anatomicalLeftShoulder, anatomicalRightShoulder);
  const [screenLeftHip, screenRightHip] = orderByScreenX(anatomicalLeftHip, anatomicalRightHip);
  const shoulderCenter = midpoint(screenLeftShoulder, screenRightShoulder);
  const hipCenter = midpoint(screenLeftHip, screenRightHip);
  const shoulderWidth = distance(screenLeftShoulder, screenRightShoulder);
  const hipWidth = distance(screenLeftHip, screenRightHip);
  const torsoHeight = Math.max(20, distance(shoulderCenter, hipCenter));
  const lateral = normalizeVector(
    screenRightShoulder.x - screenLeftShoulder.x,
    screenRightShoulder.y - screenLeftShoulder.y,
    { x: 1, y: 0 },
  );
  const bodyAxis = normalizeVector(
    hipCenter.x - shoulderCenter.x,
    hipCenter.y - shoulderCenter.y,
    { x: -lateral.y, y: lateral.x },
  );

  const baseTargetWidth = Math.max(shoulderWidth * 1.56, hipWidth * 1.28);
  const targetWidth = baseTargetWidth * fitScale;
  const naturalHeight = targetWidth * sourceAspect;
  const targetHeight = Math.min(Math.max(naturalHeight, torsoHeight * 0.72), torsoHeight * 1.72);
  const bottomWidth = Math.max(hipWidth * 1.34, baseTargetWidth * 0.78) * fitScale;

  let topCenter = addPoint(shoulderCenter, bodyAxis, -torsoHeight * 0.13);
  topCenter = addPoint(topCenter, lateral, shoulderWidth * xOffset);
  topCenter = addPoint(topCenter, bodyAxis, torsoHeight * yOffset);
  const bottomCenter = addPoint(topCenter, bodyAxis, targetHeight);

  return {
    shoulderWidth,
    hipWidth,
    torsoHeight,
    lateral,
    bodyAxis,
    quad: {
      tl: addPoint(topCenter, lateral, -targetWidth / 2),
      tr: addPoint(topCenter, lateral, targetWidth / 2),
      br: addPoint(bottomCenter, lateral, bottomWidth / 2),
      bl: addPoint(bottomCenter, lateral, -bottomWidth / 2),
    },
  };
}
