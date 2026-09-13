import assert from 'node:assert/strict';
import {
  affineFromTriangles,
  applyAffine,
  buildTorsoGeometry,
} from '../public/tools/virtual-try-on/geometry.js';

const approx = (a, b, eps = 1e-7) => Math.abs(a - b) <= eps;
const samePoint = (a, b) => approx(a.x, b.x) && approx(a.y, b.y);

const poseA = {
  anatomicalLeftShoulder: { x: 100, y: 100 },
  anatomicalRightShoulder: { x: 300, y: 108 },
  anatomicalLeftHip: { x: 130, y: 310 },
  anatomicalRightHip: { x: 270, y: 305 },
  sourceAspect: 1.2,
  fitScale: 1,
  xOffset: 0,
  yOffset: 0,
};

const poseMirroredSemanticLabels = {
  ...poseA,
  anatomicalLeftShoulder: poseA.anatomicalRightShoulder,
  anatomicalRightShoulder: poseA.anatomicalLeftShoulder,
  anatomicalLeftHip: poseA.anatomicalRightHip,
  anatomicalRightHip: poseA.anatomicalLeftHip,
};

const a = buildTorsoGeometry(poseA);
const b = buildTorsoGeometry(poseMirroredSemanticLabels);

for (const key of ['tl', 'tr', 'br', 'bl']) {
  assert.ok(samePoint(a.quad[key], b.quad[key]), `mirrored semantic labels changed ${key}`);
}
assert.ok(a.quad.tl.x < a.quad.tr.x, 'top edge must stay screen-left to screen-right');

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

console.log('Virtual Try-On geometry test: PASS — mirrored pose labels stable, affine warp exact at anchors');
