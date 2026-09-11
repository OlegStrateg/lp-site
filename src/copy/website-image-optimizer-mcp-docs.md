# Website Image Optimizer MCP — documentation

## Status

Current status: **technical candidate**.

The server and image core have passed technical verification gates. Public npm publication, Official MCP Registry publication, and a hosted endpoint are separate release steps and are not represented here as completed.

## Runtime

- Node.js: `>=22.12.0`
- verified CI runtime: Node `22.16.0`
- transport currently verified: stdio
- image engine: Sharp/libvips
- MCP implementation: `@modelcontextprotocol/server` v2 line

## Architecture

```text
caller-provided image/page facts ─┐
                                 ├→ deterministic image policy → verified candidate → temporary MCP resource
public HTTP(S) page URL ─────────┘
          ↓
SSRF-protected bounded fetch
          ↓
static HTML <img> discovery only
```

Browser-aware facts and URL fast mode are intentionally separate. URL mode does not claim rendered dimensions, browser-selected `currentSrc`, LCP, CSS background images, or JavaScript-driven lazy content.

## Tools

The current stdio server registers seven tools.

### `analyze_page_images`
Analyzes normalized page-image facts supplied by the caller. Browser-only facts such as rendered size or confirmed LCP are trusted only when explicitly supplied by the collector.

### `optimize_image`
Optimizes one caller-provided image using bounded policy. Accepted output is exposed as a temporary `resource_link` rather than embedded in the initial tool text.

### `generate_responsive_variants`
Produces up to 6 responsive variants without upscaling. Each accepted variant is associated with its own temporary resource URI.

### `compare_image_versions`
Compares original and candidate versions for bytes saved and guard regressions.

### `optimize_page_images`
Processes up to 20 already-selected image items. It does not crawl or write to production.

### `analyze_url_images`
Performs bounded read-only HTTP(S) ingestion of a public page and selected static `<img>` resources. It reports static HTML/image facts only.

### `optimize_url_images`
Performs the same bounded URL ingestion, then recompresses fetched images at their original dimensions. HTML width/height hints are not used as an automatic resize target. Accepted candidates are exposed as temporary MCP resources and are never written back to the site.

## Artifact contract

For accepted binary outputs the tool result contains:

- text/structured metadata describing status, source/output facts and savings;
- an MCP `resource_link` URI such as `layerporter-artifact://artifact/<id>`.

A compatible client calls `resources/read` for that URI. The resource response contains the blob plus MIME type and metadata including SHA-256, size and expiry. The store rechecks size and SHA-256 before returning a resource.

Important limits:

- resources are process-local and temporary;
- default TTL is 30 minutes;
- cleanup is opportunistic during store operations/disposal, not a promise of deletion at an exact wall-clock second;
- the in-memory index is not recovered after process restart;
- `resources/read` returns base64 as required by the resource response shape, so downstream model-context use depends on the client.

REJECT results remain diagnostics and are not exposed as improved artifacts.

## Local source setup

A source checkout does not contain the generated MCP-local image-core copy. Run sync explicitly before tests or direct server startup:

```bash
cd packages/image-core
npm install --no-audit --no-fund
npm test

cd ../image-optimizer-mcp
npm install --ignore-scripts --no-audit --no-fund
npm run release:preflight
npm run sync:core
npm test
node src/server.js
```

`npm pack` independently runs `sync:core` through the package `prepack` hook, so source setup and packed-artifact setup are separate verification paths.

## URL security boundary

Network access exists only in the URL tools and passes through the dedicated secure fetch layer. The current controls include:

- HTTP(S) only;
- URL credentials rejected;
- localhost/private/link-local/reserved targets rejected;
- DNS answers validated at connection lookup time;
- redirects handled manually and each destination revalidated;
- page-byte and per-image-byte caps;
- bounded accepted total-image byte budget;
- request timeout and redirect limits;
- bounded image count and concurrency;
- required HTML/image content types plus image decoding before acceptance.

The accepted-total-image byte budget limits the set retained for analysis/optimization. It is not advertised as a strict cap on aggregate network bytes already downloaded before the final accepted-set decision.

## Default image policy

```text
format: auto
quality: 82
avifQuality: 50
effort: 4
withoutEnlargement: true
preserveAlpha: true
preserveOrientation: true
neverIncreaseBytes: true
maxWidth: 8192
maxHeight: 8192
maxPixels: 40,000,000
```

Automatic format selection remains conservative. AVIF support does not imply automatic AVIF conversion for every input.

## MCP risk metadata

Caller-buffer transforms are closed-domain, read-only/non-destructive operations. URL tools are explicitly open-world but remain read-only. MCP annotations are metadata hints; enforcement comes from the code paths and limits above.

## Verification expectations

A release candidate is not accepted merely because the server starts. The release smoke must cover:

1. source setup without a pre-generated MCP-local core;
2. `npm pack` and clean tarball installation outside the monorepo;
3. real stdio client initialize and `tools/list`;
4. accepted `optimize_image` → `resource_link` → `resources/read`;
5. decoded file SHA-256, byte length, MIME and image dimensions;
6. batch and responsive variants with correct URI association;
7. REJECT behavior without exposing an unverified artifact;
8. unknown/expired/repeated resource reads and store limits;
9. URL security tests and controlled URL-mode partial/no-image cases;
10. package identity/files/secrets checks before any authorized publication.

## Engineering benchmark

Synthetic fixture benchmark values are engineering evidence only. They must not be presented as universal savings, visual-quality or SEO/Core Web Vitals results.

## Known limitations

- URL mode is static-HTML fast mode, not a full browser crawler;
- no CSS background-image discovery in URL mode;
- no JavaScript-driven lazy-content discovery in URL mode;
- no rendered-size/currentSrc/LCP measurement inside URL mode;
- no hosted endpoint yet;
- no public npm/Official Registry release yet;
- no production write/apply step;
- no universal visual-quality guarantee;
- current batch and URL orchestration remain intentionally bounded.

## Release sequence

Public-release status changes only after external evidence exists for the exact published package/version and, separately, the exact Official MCP Registry entry.

Return to the [Website Image Optimizer MCP product page](/mcp/website-image-optimizer/).
