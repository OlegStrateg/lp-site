import assert from 'node:assert/strict';
import {
  affineFromTriangles,
  applyAffine,
  buildTorsoGeometry,
} from '../public/tools/virtual-try-on/geometry.js';

const approx = (a, b, eps = 1e-7) => Math.abs(a - b) <= eps;
const samePoint = (a, b, eps = 1e-7) => approx(a.x, b.x, eps) && approx(a.y, b.y, eps);
const finitePoint = (p) => Number.isFinite(p.x) && Number.isFinite(p.y);

function assertMirrorStable(pose) {
  const mirroredLabels = {
    ...pose,
    anatomicalLeftShoulder: pose.anatomicalRightShoulder,
    anatomicalRightShoulder: pose.anatomicalLeftShoulder,
    anatomicalLeftHip: pose.anatomicalRightHip,
    anatomicalRightHip: pose.anatomicalLeftHip,
  };
  const a = buildTorsoGeometry(pose);
  const b = buildTorsoGeometry(mirroredLabels);
  for (const key of ['tl', 'tr', 'br', 'bl']) {
    assert.ok(samePoint(a.quad[key], b.quad[key], 1e-6), `mirrored semantic labels changed ${key}`);
    assert.ok(finitePoint(a.quad[key]), `non-finite point ${key}`);
  }
  assert.ok(a.shoulderWidth > 0, 'shoulder width must be positive');
  assert.ok(a.torsoHeight >= 20, 'torso height floor broken');
  return a;
}

assertMirrorStable({
  anatomicalLeftShoulder: { x: 100, y: 100 },
  anatomicalRightShoulder: { x: 300, y: 108 },
  anatomicalLeftHip: { x: 130, y: 310 },
  anatomicalRightHip: { x: 270, y: 305 },
  sourceAspect: 1.2,
  fitScale: 1,
  xOffset: 0,
  yOffset: 0,
});

let seed = 0x1a2b3c4d;
const rand = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 0x100000000;
};

for (let i = 0; i < 1000; i += 1) {
  const centerX = 250 + (rand() - 0.5) * 120;
  const shoulderY = 100 + rand() * 90;
  const shoulderWidth = 110 + rand() * 220;
  const shoulderTilt = (rand() - 0.5) * 50;
  const hipY = shoulderY + 120 + rand() * 260;
  const hipWidth = shoulderWidth * (0.55 + rand() * 0.7);
  const hipTilt = (rand() - 0.5) * 35;
  const xDrift = (rand() - 0.5) * 80;

  const pose = {
    anatomicalLeftShoulder: { x: centerX - shoulderWidth / 2, y: shoulderY - shoulderTilt / 2 },
    anatomicalRightShoulder: { x: centerX + shoulderWidth / 2, y: shoulderY + shoulderTilt / 2 },
    anatomicalLeftHip: { x: centerX + xDrift - hipWidth / 2, y: hipY - hipTilt / 2 },
    anatomicalRightHip: { x: centerX + xDrift + hipWidth / 2, y: hipY + hipTilt / 2 },
    sourceAspect: 0.75 + rand() * 1.4,
    fitScale: 0.75 + rand() * 0.6,
    xOffset: -0.25 + rand() * 0.5,
    yOffset: -0.25 + rand() * 0.5,
  };

  assertMirrorStable(pose);
}

const s0 = { x: 0, y: 0 };
const s1 = { x: 100, y: 0 };
const s2 = { x: 0, y: 100 };
const d0 = { x: 20, y: 30 };
const d1 = { x: 220, y: 50 };
const d2 = { x: 40, y: 330 };
const transform = affineFromTriangles(s0, s1, s2, d0, d1, d2);
assert.ok(transform, 'affine transform must exist');
assert.ok(samePoint(applyAffine(transform, s0), d0));
assert.ok(samePoint(applyAffine(transform, s1), d1));
assert.ok(samePoint(applyAffine(transform, s2), d2));

const degenerate = affineFromTriangles(
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 2 },
  d0, d1, d2,
);
assert.equal(degenerate, null, 'degenerate source triangle must be rejected');

console.log('Virtual Try-On geometry test: PASS — 1000 mirrored-label poses stable, affine anchors exact, degenerate triangles rejected');
