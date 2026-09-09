import test from 'node:test';
import assert from 'node:assert/strict';
import { runAuditRules } from '../src/rules.js';

test('prioritizes critical noindex and high SEO findings', () => {
  const findings = runAuditRules({ seo: { title: '', metaDescription: '', canonical: '', h1Count: 0, noindex: true }, images: [] });
  assert.equal(findings[0].id, 'noindex');
  assert.ok(findings.some((f) => f.id === 'missing_title'));
  assert.ok(findings.some((f) => f.id === 'missing_h1'));
});

test('flags oversized image and declared-dimension gaps without inventing LCP', () => {
  const findings = runAuditRules({
    seo: { title: 'x', metaDescription: 'y', canonical: 'https://example.com/', h1Count: 1, noindex: false },
    images: [{ id: 'hero', intrinsicWidth: 2400, renderedWidth: 700, widthAttr: null, heightAttr: null, srcset: '', loading: 'lazy', isLikelyHero: true }],
  });
  assert.ok(findings.some((f) => f.id === 'oversized_image:hero'));
  assert.ok(findings.some((f) => f.id === 'missing_image_dimensions:hero'));
  const hero = findings.find((f) => f.id === 'hero_lazy:hero');
  assert.match(hero.fact, /likely|prominent/i);
  assert.match(hero.verification, /actual LCP/i);
});
