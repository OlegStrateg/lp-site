# Website Image Optimizer MCP — documentation

## Status

Current status: **technical candidate**.

The server and image core have passed the technical verification gate. Public npm publication, Official MCP Registry publication, and a hosted endpoint are separate release steps and are not represented here as completed.

## Runtime

- Node.js: `>=22.12.0`
- verified CI runtime: Node `22.16.0`
- transport currently verified: stdio
- image engine: Sharp/libvips
- MCP implementation: `@modelcontextprotocol/server` v2 line

## Architecture

```text
caller / browser collector
        ↓
normalized page facts
        ↓
analyze_page_images
        ↓
normalized Findings
        ↓
caller selects SAFE image work
        ↓
image-core policy + Sharp/libvips
        ↓
optimized artifacts + before/after evidence
```

The MCP layer is deliberately thin. Browser collection, crawling, production writes, and general-purpose image editing do not live inside image-core.

## Tools

### `analyze_page_images`

Purpose: analyze normalized page-image facts.

Input concept:

```json
{
  "snapshot": {
    "pageUrl": "https://example.com/",
    "images": [
      {
        "src": "https://example.com/hero.jpg",
        "intrinsicWidth": 2400,
        "intrinsicHeight": 1600,
        "renderedWidth": 960,
        "renderedHeight": 640,
        "devicePixelRatio": 1,
        "bytes": 420000,
        "format": "jpeg",
        "loading": "lazy",
        "fetchPriority": "auto",
        "widthAttr": 2400,
        "heightAttr": 1600,
        "lcp": true
      }
    ]
  }
}
```

Possible deterministic Findings include:

- `oversized_image`;
- `missing_srcset`;
- `missing_sizes`;
- `missing_dimension_attributes`;
- `lcp_lazy_loaded`;
- `lcp_missing_fetchpriority`.

Important distinction: a visually prominent hero candidate is not treated as confirmed LCP unless the caller supplies confirmed LCP evidence.

### `optimize_image`

Purpose: optimize one image using bounded policy.

Conceptual input:

```json
{
  "imageBase64": "...",
  "target": { "width": 1280 },
  "policy": {
    "format": "webp",
    "quality": 82,
    "neverIncreaseBytes": true,
    "withoutEnlargement": true
  }
}
```

Core decisions are deterministic. The MCP server does not ask an LLM to choose encoder internals.

### `generate_responsive_variants`

Purpose: produce a bounded responsive set from one source image.

Limits:

- maximum requested widths: 6;
- widths above the original are discarded;
- duplicate widths are removed;
- no-upscale remains active.

### `compare_image_versions`

Purpose: compare original and candidate image versions.

Checks include:

- bytes saved;
- savings percentage;
- alpha regression;
- dimension regression.

A smaller file is not automatically accepted if a guard regression is detected.

### `optimize_page_images`

Purpose: bounded batch orchestration over items already selected for image optimization.

Limits:

- maximum 20 items per call;
- sequential processing in the current implementation;
- no production writes;
- no crawling or remote fetch inside the tool.

## Default image policy

The current image-core policy includes:

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

Automatic format policy is intentionally conservative:

- JPEG → WebP;
- PNG → WebP;
- WebP stays WebP;
- AVIF stays AVIF;
- alpha-bearing PNG defaults to WebP;
- AVIF is not automatically forced onto JPEG/PNG solely because it may compress smaller.

## Safety and privacy boundary

### Current local stdio server

The current verified server receives data from the MCP client and performs local processing. The MCP layer itself contains no HTTP fetch, arbitrary filesystem write, shell execution, rename/delete operation, or direct production mutation.

This means the current code path does **not** claim to upload image data to a LayerPorter hosted service.

### Hosted mode

A public hosted service is not yet released. Therefore no hosted retention duration, authentication scheme, quota, or data-location promise is published as fact yet. Those items require a separate hosted deployment/security review.

### Remote URL processing

The image-core does not fetch remote URLs. If remote URL ingestion is added later, it must sit behind a dedicated security boundary with SSRF protection, redirect revalidation, private-address blocking, byte caps, decoded-pixel caps, timeout budgets, and bounded concurrency.

## MCP risk metadata

The tools are designed as closed-domain, non-destructive transformations: they operate on caller-provided data and return analysis or transformed results rather than modifying an external environment.

MCP tool annotations are metadata hints, not enforcement. The hard safety boundary remains the implementation: no production write path, no network fetch in the MCP layer, bounded inputs, and deterministic image policy.

## Verification evidence

Final technical gate:

- GitHub Actions Run ID: `34341457360`;
- commit verified by the run: `3f1e48409f297c49c54fe0d678f29422f0d37649`;
- image-core: 17/17 PASS;
- MCP contracts: 4/4 PASS;
- stdio server startup: PASS.

The gate found and fixed three real implementation problems before it passed:

1. MCP v2 tool registration API mismatch;
2. Sharp/libvips reporting AVIF as HEIF + AV1;
3. EXIF orientation causing a false no-upscale failure.

## Engineering benchmark

The current benchmark uses a deterministic synthetic 960×640 fixture and resizes to 640 px width.

| Source | Target | Source bytes | Output bytes | Savings | Time |
| --- | --- | ---: | ---: | ---: | ---: |
| JPEG | WebP | 375456 | 79846 | 78.73% | ~32 ms |
| JPEG | AVIF | 375456 | 39946 | 89.36% | ~234 ms |
| PNG | WebP | 509201 | 80452 | 84.20% | ~28 ms |
| PNG | AVIF | 509201 | 42222 | 91.71% | ~240 ms |
| WebP | WebP | 185262 | 76114 | 58.92% | ~41 ms |
| WebP | AVIF | 185262 | 39074 | 78.91% | ~219 ms |
| AVIF | WebP | 151848 | 80184 | 47.19% | ~79 ms |
| AVIF | AVIF | 151848 | 41803 | 72.47% | ~261 ms |

These values are engineering evidence for this fixture only. They must not be presented as universal expected savings or quality results.

## Known limitations

- no page crawler inside the MCP server;
- no remote URL fetch;
- no hosted endpoint yet;
- no public npm/registry release yet;
- no production write/apply step;
- no visual quality metric such as SSIM/Butteraugli in the current gate;
- no large real-world corpus benchmark yet;
- current batch orchestration is intentionally bounded and simple;
- page facts must currently be collected by the caller/collector layer.

## Release sequence

The next public release work is separate from this documentation:

1. prepare package/repository metadata;
2. publish the first public package/artifact;
3. create Official MCP Registry metadata;
4. verify installation from the public artifact;
5. only then change release status from technical candidate to public release.

Return to the [Website Image Optimizer MCP product page](/mcp/website-image-optimizer/).
