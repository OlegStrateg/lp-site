import { createCoverage, createEvidence, createFinding } from './schema.js';

const PRIORITY_WEIGHT = Object.freeze({ critical: 4, high: 3, medium: 2, low: 1 });

function sameCanonical(a, b) {
  try {
    const normalize = (value) => {
      const url = new URL(value);
      url.hash = '';
      url.search = '';
      return url.toString().replace(/\/$/, '');
    };
    return normalize(a) === normalize(b);
  } catch {
    return false;
  }
}

function schemaTypes(jsonLd) {
  const types = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const type = value['@type'];
    if (Array.isArray(type)) type.forEach((t) => types.add(String(t)));
    else if (type) types.add(String(type));
    Object.values(value).forEach(visit);
  };
  for (const entry of jsonLd) if (entry.valid) visit(entry.value);
  return [...types];
}

function add(findings, finding) {
  findings.push(createFinding(finding));
}

function auditSeo(facts, findings) {
  if (facts.status < 200 || facts.status >= 300) {
    add(findings, {
      id: 'seo-http-status', direction: 'seo', url: facts.url, element: 'document',
      observation: `Page returned HTTP ${facts.status}.`,
      evidence: [createEvidence('http_status', facts.status, 'http')],
      priority: { level: 'high', reason: 'A non-2xx response can prevent normal crawling and user access.' },
      action: 'Restore a successful canonical page response before content-level optimization.',
      verification: 'Request the canonical URL again and confirm a 2xx response without an unintended redirect chain.',
      automation: { status: 'review', reason: 'Response behavior may depend on hosting and routing.' },
    });
  }

  if (!facts.title) {
    add(findings, {
      id: 'seo-title-missing', direction: 'seo', url: facts.url, element: 'title',
      observation: 'The document has no non-empty title element.',
      evidence: [createEvidence('title', facts.title)],
      priority: { level: 'high', reason: 'The page lacks a primary document title signal.' },
      action: 'Add a concise title that matches the page intent and visible H1.',
      verification: 'Build the page and inspect the resulting <title>.',
      automation: { status: 'prepare', reason: 'The source title can usually be prepared safely for review.' },
    });
  }

  if (!facts.metaDescription) {
    add(findings, {
      id: 'seo-description-missing', direction: 'seo', url: facts.url, element: 'meta[name="description"]',
      observation: 'The document has no non-empty meta description.',
      evidence: [createEvidence('meta_description', facts.metaDescription)],
      priority: { level: 'medium', reason: 'Search engines may generate their own snippet; a useful description improves control of the page summary but is not a ranking guarantee.' },
      action: 'Add a factual description aligned with the visible page purpose.',
      verification: 'Inspect built HTML and confirm the description matches visible content.',
      automation: { status: 'prepare', reason: 'Copy can be prepared but should be reviewed for accuracy.' },
    });
  }

  if (facts.h1.length !== 1) {
    add(findings, {
      id: 'seo-h1-count', direction: 'seo', url: facts.url, element: 'h1',
      observation: `Expected one primary H1; found ${facts.h1.length}.`,
      evidence: [createEvidence('h1_values', facts.h1)],
      priority: { level: facts.h1.length === 0 ? 'high' : 'medium', reason: 'A single clear page heading reduces ambiguity in document structure.' },
      action: 'Keep one visible H1 that states the page purpose; demote secondary top-level headings if needed.',
      verification: 'Inspect built HTML and browser accessibility tree.',
      automation: { status: 'review', reason: 'Heading changes can affect layout and meaning.' },
    });
  }

  if (!facts.canonical) {
    add(findings, {
      id: 'seo-canonical-missing', direction: 'seo', url: facts.url, element: 'link[rel="canonical"]',
      observation: 'No canonical URL was found.',
      evidence: [createEvidence('canonical', null)],
      priority: { level: 'medium', reason: 'The preferred URL is not declared in the document.' },
      action: 'Add a self-referencing canonical for this indexable page unless a deliberate canonical target is required.',
      verification: 'Inspect the built head and request the canonical target.',
      automation: { status: 'prepare', reason: 'A canonical can be prepared when the intended URL is known.' },
    });
  } else if (!sameCanonical(facts.canonical, facts.url)) {
    add(findings, {
      id: 'seo-canonical-mismatch', direction: 'seo', url: facts.url, element: 'link[rel="canonical"]',
      observation: 'The canonical points to a different URL than the audited page.',
      evidence: [createEvidence('canonical', facts.canonical), createEvidence('audited_url', facts.url)],
      priority: { level: 'medium', reason: 'A cross-canonical can be intentional, so it requires confirmation rather than automatic replacement.' },
      action: 'Confirm the canonical intent. Change it only if the current target is not deliberate.',
      verification: 'Compare source routing, sitemap/hreflang ownership and the final rendered canonical.',
      automation: { status: 'human_required', reason: 'Canonical ownership is a product/SEO decision.' },
    });
  }

  const invalidLd = facts.jsonLd.filter((entry) => !entry.valid);
  if (invalidLd.length > 0) {
    add(findings, {
      id: 'seo-jsonld-invalid', direction: 'seo', url: facts.url, element: 'script[type="application/ld+json"]',
      observation: `${invalidLd.length} JSON-LD block(s) could not be parsed.`,
      evidence: invalidLd.slice(0, 3).map((entry) => createEvidence('jsonld_error', entry.error)),
      priority: { level: 'medium', reason: 'Invalid structured data cannot be consumed as intended.' },
      action: 'Fix JSON serialization without adding schema that is not represented on the page.',
      verification: 'Parse every built JSON-LD block and compare fields with visible content.',
      automation: { status: 'prepare', reason: 'Syntax fixes are deterministic; semantic changes still require review.' },
    });
  }
}

function auditAiSearch(facts, findings, types) {
  if (facts.wordCount < 40) {
    add(findings, {
      id: 'ai-content-thin-for-direct-answer', direction: 'ai_search', url: facts.url, element: 'main/body',
      observation: `Only ${facts.wordCount} visible words were extracted from static HTML.`,
      evidence: [createEvidence('visible_word_count', facts.wordCount)],
      priority: { level: 'medium', reason: 'There may be too little accessible static context to explain the page purpose and limitations. This does not prove poor AI visibility.' },
      action: 'Ensure the core purpose, result, limits and important facts are available as visible crawlable text.',
      verification: 'Re-extract static text and separately test browser-rendered content if JavaScript supplies material facts.',
      automation: { status: 'review', reason: 'Content sufficiency depends on page intent.' },
      limitations: ['This is a content-availability check, not a citation or ranking prediction.'],
    });
  }

  if (!facts.paragraphs.some((p) => p.length >= 60)) {
    add(findings, {
      id: 'ai-direct-answer-missing', direction: 'ai_search', url: facts.url, element: 'introductory copy',
      observation: 'No substantial explanatory paragraph was found in static HTML.',
      evidence: [createEvidence('paragraph_lengths', facts.paragraphs.slice(0, 8).map((p) => p.length))],
      priority: { level: 'medium', reason: 'A direct factual explanation helps users and retrieval systems understand the page without inferring the product from controls alone.' },
      action: 'Add a concise answer-first explanation of what the page does and its material limitations.',
      verification: 'Confirm the explanation is visible without interaction and agrees with actual behavior.',
      automation: { status: 'review', reason: 'Claims must be checked against the product.' },
      limitations: ['Does not measure whether any AI system cites the page.'],
    });
  }

  const hasIdentity = types.some((type) => ['Organization', 'SoftwareApplication', 'WebSite', 'Product'].includes(type));
  if (!hasIdentity) {
    add(findings, {
      id: 'ai-entity-context-missing', direction: 'ai_search', url: facts.url, element: 'structured data / visible product context',
      observation: 'No Organization, SoftwareApplication, WebSite or Product type was found in valid JSON-LD.',
      evidence: [createEvidence('schema_types', types)],
      priority: { level: 'low', reason: 'Explicit entity context can reduce ambiguity when it truthfully matches visible content, but schema alone does not create AI visibility.' },
      action: 'Only add applicable entity markup if the same facts are visible and verifiable on the page.',
      verification: 'Compare structured data with visible publisher/product information.',
      automation: { status: 'human_required', reason: 'Entity and publisher claims must not be invented.' },
      limitations: ['Schema is not a guarantee of citation or inclusion in AI answers.'],
    });
  }
}

function auditCro(facts, findings) {
  const pageLooksLikeTool = /\b(convert|converter|generator|checker|download|optimi[sz])\b/i.test(`${facts.title} ${facts.h1.join(' ')}`);
  const hasInteractiveStart = facts.hasFileInput || facts.forms.length > 0 || facts.buttons.length > 0;
  if (pageLooksLikeTool && !hasInteractiveStart) {
    add(findings, {
      id: 'cro-primary-action-missing', direction: 'cro', url: facts.url, element: 'primary interaction',
      observation: 'The page presents itself as a tool but no file input, form or button was found in static HTML.',
      evidence: [createEvidence('file_input', facts.hasFileInput), createEvidence('forms', facts.forms.length), createEvidence('buttons', facts.buttons.length)],
      priority: { level: 'high', reason: 'A user arriving for the stated task has no visible way to start it in the static document.' },
      action: 'Expose the primary action clearly and verify it remains usable after hydration.',
      verification: 'Browser-test the first user action on desktop and mobile.',
      automation: { status: 'review', reason: 'Interaction changes require browser verification.' },
    });
  }

  if (pageLooksLikeTool && !facts.hasDownloadControl) {
    add(findings, {
      id: 'cro-result-path-not-explicit', direction: 'cro', url: facts.url, element: 'result/download',
      observation: 'No download control or explicit download text was found in static HTML for a tool page.',
      evidence: [createEvidence('has_download_control', facts.hasDownloadControl)],
      priority: { level: 'medium', reason: 'The path from task start to obtaining the result is not evident from the static experience.' },
      action: 'Make the result/download state explicit in markup and verify a real file can be obtained.',
      verification: 'Complete the browser flow and decode/open the downloaded file.',
      automation: { status: 'review', reason: 'The real result must be verified rather than inferred from copy.' },
    });
  }
}

function auditImages(facts, findings) {
  for (const image of facts.images) {
    const ref = image.src || `img[${image.index}]`;
    if (!image.altPresent) {
      add(findings, {
        id: `img-alt-${image.index}`, direction: 'images_performance', url: facts.url, element: ref,
        observation: 'Image has no alt attribute.',
        evidence: [createEvidence('image_src', image.src), createEvidence('alt_present', false)],
        priority: { level: 'medium', reason: 'Missing alt requires classification as meaningful or decorative; an empty alt can be correct for decoration.' },
        action: 'Classify the image. Add concise contextual alt for meaningful content or alt="" for decoration.',
        verification: 'Inspect the rendered image in context and the accessibility tree.',
        automation: { status: 'human_required', reason: 'Alt text requires understanding what the image communicates.' },
      });
    }
    if (!image.width || !image.height) {
      add(findings, {
        id: `img-dimensions-${image.index}`, direction: 'images_performance', url: facts.url, element: ref,
        observation: 'Image is missing an explicit width and/or height attribute.',
        evidence: [createEvidence('width', image.width), createEvidence('height', image.height), createEvidence('image_src', image.src)],
        priority: { level: 'medium', reason: 'Intrinsic dimensions can reserve layout space; actual layout impact must be verified in the browser.' },
        action: 'Add correct intrinsic dimensions when they are stable for this asset.',
        verification: 'Confirm rendered aspect ratio and layout before/after in a browser.',
        automation: { status: 'prepare', reason: 'Dimensions can be prepared when intrinsic asset metadata is known.' },
        limitations: ['Static HTML alone does not prove a CLS regression.'],
      });
    }
  }
}

export function auditPageFacts(facts) {
  if (!facts?.url) throw new Error('page facts with url are required');
  const findings = [];
  const types = schemaTypes(facts.jsonLd ?? []);
  auditSeo(facts, findings);
  auditAiSearch(facts, findings, types);
  auditCro(facts, findings);
  auditImages(facts, findings);

  findings.sort((a, b) => PRIORITY_WEIGHT[b.priority.level] - PRIORITY_WEIGHT[a.priority.level] || a.id.localeCompare(b.id));

  const coverage = {
    static_html: createCoverage('checked', { url: facts.url, status: facts.status }),
    seo: createCoverage('checked', { title: Boolean(facts.title), h1Count: facts.h1.length, canonical: facts.canonical }),
    ai_search_readiness: createCoverage('checked', { visibleWordCount: facts.wordCount, schemaTypes: types }, 'Prerequisites only; no external AI citation test was performed.'),
    cro_static: createCoverage('checked', { fileInput: facts.hasFileInput, buttons: facts.buttons.length, downloadControl: facts.hasDownloadControl }),
    images_static: createCoverage('checked', { imageCount: facts.images.length }),
    browser_rendered: createCoverage('not_checked', null, 'Requires a real browser run.'),
    network_console: createCoverage('not_checked', null, 'Requires a real browser run.'),
    field_analytics: createCoverage('not_available', null, 'No analytics or field-performance dataset was supplied to this audit call.'),
    ai_mentions: createCoverage('not_checked', null, 'AI-readiness is not evidence of citation; external system tests are separate.'),
  };

  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    page: { url: facts.url, status: facts.status, title: facts.title, canonical: facts.canonical },
    coverage,
    summary: {
      findingCount: findings.length,
      byDirection: Object.fromEntries(['seo', 'ai_search', 'cro', 'images_performance'].map((direction) => [direction, findings.filter((f) => f.direction === direction).length])),
      note: findings.length < 3 ? 'Fewer than three evidence-backed issues were found; the report does not pad the top list with invented problems.' : null,
    },
    topFindings: findings.slice(0, 5),
    findings,
  };
}
