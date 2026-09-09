import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeImageUsage, analyzePageImages } from '../src/page-analysis.js';

test('detects oversized image using DPR-adjusted rendered size', () => {
  const result = analyzeImageUsage({
    src: 'https://example.com/hero.jpg',
    intrinsicWidth: 2400,
    intrinsicHeight: 1600,
    renderedWidth: 600,
    renderedHeight: 400,
    devicePixelRatio: 2,
    bytes: 800000,
    format: 'jpeg',
    widthAttr: 2400,
    heightAttr: 1600,
  });
  assert.equal(result.oversizeRatio, 2);
  assert.ok(result.findings.some((x) => x.id === 'oversized_image' && x.autoFixability === 'SAFE'));
});

test('does not call hero candidate confirmed LCP', () => {
  const result = analyzeImageUsage({
    src: 'https://example.com/hero.webp',
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    renderedWidth: 1200,
    renderedHeight: 800,
    hero: true,
    loading: 'lazy',
  });
  assert.equal(result.role.value, 'hero_candidate');
  assert.equal(result.findings.some((x) => x.id === 'lcp_lazy_loaded'), false);
});

test('confirmed LCP flags lazy loading and missing fetchpriority', () => {
  const result = analyzeImageUsage({
    currentSrc: 'https://example.com/lcp.webp',
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    renderedWidth: 1200,
    renderedHeight: 800,
    lcp: true,
    loading: 'lazy',
    fetchPriority: 'auto',
    widthAttr: 1200,
    heightAttr: 800,
    srcset: 'lcp-600.webp 600w, lcp-1200.webp 1200w',
    sizes: '100vw',
  });
  const ids = result.findings.map((x) => x.id);
  assert.ok(ids.includes('lcp_lazy_loaded'));
  assert.ok(ids.includes('lcp_missing_fetchpriority'));
  assert.equal(result.role.confidence, 1);
});

test('srcset without sizes is review, not safe auto-fix', () => {
  const result = analyzeImageUsage({
    src: 'https://example.com/content.webp',
    intrinsicWidth: 1000,
    intrinsicHeight: 500,
    renderedWidth: 800,
    renderedHeight: 400,
    srcset: 'content-500.webp 500w, content-1000.webp 1000w',
  });
  const finding = result.findings.find((x) => x.id === 'missing_sizes');
  assert.equal(finding.autoFixability, 'REVIEW');
});

test('page analyzer attaches page URL and sorts high severity first', () => {
  const report = analyzePageImages({
    pageUrl: 'https://example.com/',
    images: [
      {
        src: 'https://example.com/a.jpg',
        intrinsicWidth: 2000,
        intrinsicHeight: 1000,
        renderedWidth: 500,
        renderedHeight: 250,
      },
      {
        src: 'https://example.com/b.webp',
        intrinsicWidth: 1000,
        intrinsicHeight: 600,
        renderedWidth: 1000,
        renderedHeight: 600,
        lcp: true,
        loading: 'lazy',
        widthAttr: 1000,
        heightAttr: 600,
        srcset: 'b.webp 1000w',
        sizes: '100vw',
      },
    ],
  });
  assert.equal(report.imageCount, 2);
  assert.equal(report.findings[0].severity, 'high');
  assert.equal(report.findings.every((x) => x.pageUrl === 'https://example.com/'), true);
});
