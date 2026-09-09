import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFindings, priorityScore } from '../src/findings.js';

test('aggregates repeated element findings into one work item', () => {
  const raw = Array.from({ length: 8 }, (_, index) => ({
    id: `missing_image_dimensions:img-${index}`,
    severity: 'medium',
    title: 'Image dimensions not declared',
    fact: `image ${index} missing width/height`,
    impact: 'Layout stability can be harder for the browser to reserve.',
    fixability: 'safe-candidate',
    verification: 'Re-read image width and height attributes.',
  }));
  const [item] = normalizeFindings(raw);
  assert.equal(item.ruleId, 'missing_image_dimensions');
  assert.equal(item.affectedCount, 8);
  assert.equal(item.evidence.length, 5);
  assert.equal(item.confidence, 'high');
  assert.equal(item.category, 'images');
});

test('keeps page-level findings separate', () => {
  const raw = [
    { id: 'missing_title', severity: 'high', title: 'Missing title', fact: 'empty', impact: 'impact', verification: 'verify' },
    { id: 'missing_h1', severity: 'high', title: 'Missing H1', fact: 'none', impact: 'impact', verification: 'verify' },
  ];
  const items = normalizeFindings(raw);
  assert.equal(items.length, 2);
});

test('hero heuristic is medium confidence and therefore scores below confirmed high-confidence high severity', () => {
  const items = normalizeFindings([
    { id: 'hero_lazy:hero', severity: 'high', title: 'Likely hero image is lazy-loaded', fact: 'heuristic', impact: 'impact', verification: 'confirm LCP' },
    { id: 'missing_title', severity: 'high', title: 'Missing title', fact: 'empty', impact: 'impact', verification: 'verify' },
  ]);
  assert.equal(items[0].ruleId, 'missing_title');
  assert.equal(items[1].confidence, 'medium');
});

test('scale increases priority without overpowering severity tiers', () => {
  assert.ok(priorityScore({ severity: 'high', confidence: 'high', affectedCount: 1 }) > priorityScore({ severity: 'medium', confidence: 'high', affectedCount: 20 }));
  assert.ok(priorityScore({ severity: 'medium', confidence: 'high', affectedCount: 20 }) > priorityScore({ severity: 'medium', confidence: 'high', affectedCount: 1 }));
});
