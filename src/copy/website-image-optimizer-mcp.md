# Website Image Optimizer MCP

**Page-aware image optimization for AI agents and developer workflows.**

LayerPorter Website Image Optimizer is a Model Context Protocol server that analyzes how images are actually used on a web page, optimizes selected images with deterministic safety guards, generates responsive variants, and returns before/after evidence.

It is intentionally **not** a generic image editor, CDN, crawler, or autonomous production writer.

## What it solves

A normal image converter sees a file. Website Image Optimizer also understands page context supplied by the caller:

- intrinsic image dimensions;
- rendered dimensions and device-pixel ratio;
- source bytes and format;
- `srcset` and `sizes` state;
- `loading` and `fetchpriority`;
- explicit width and height attributes;
- confirmed LCP evidence versus a weaker hero-candidate signal.

The result is a deterministic chain:

`PAGE CONTEXT → FINDINGS → POLICY → OPTIMIZED VARIANTS → BEFORE/AFTER EVIDENCE`

## Five bounded MCP tools

### `analyze_page_images`

Analyzes an already-normalized page snapshot and returns deterministic image findings such as oversized images, missing responsive markup, missing dimensions, or confirmed LCP loading problems.

### `optimize_image`

Optimizes one image with bounded resize and format policy. It never upscales by default and returns the original when the candidate does not reduce bytes.

### `generate_responsive_variants`

Generates a bounded responsive set without upscaling. Maximum: 6 requested variants.

### `compare_image_versions`

Compares original and candidate versions for byte savings and guard regressions.

### `optimize_page_images`

Processes an already-selected bounded batch of SAFE image items. Maximum: 20 images per call.

## Safety boundary

The current stdio server:

- does not write to a website or production environment;
- does not perform arbitrary filesystem operations;
- does not fetch remote URLs;
- does not execute shell commands;
- does not modify checkout, forms, analytics, authentication, backend code, pricing, positioning, or business logic;
- accepts only bounded image inputs and normalized page facts.

Image-core protections include:

- no-upscale by default;
- `never-increase-bytes` guard;
- alpha preservation;
- EXIF orientation normalization;
- ICC profile retention;
- maximum width, height, and decoded-pixel limits;
- allowlisted JPEG, PNG, WebP, and AVIF output formats.

## Format policy

WebP is the conservative automatic baseline for JPEG/PNG sources. AVIF is supported explicitly, but is not automatically selected solely because it can produce a smaller file: encoding cost and the real gain must justify it.

## Verified technical status

The implementation has passed a clean GitHub Actions gate on Ubuntu 24.04 and Node 22.16.0:

- 17/17 image-core tests;
- 4/4 MCP contract tests;
- JPEG, PNG, WebP, AVIF;
- alpha preservation;
- EXIF orientation;
- no-upscale;
- `never-increase-bytes`;
- page-aware findings;
- real stdio server startup.

## Benchmark status

A deterministic synthetic 960×640 fixture is used only as an engineering benchmark, not as a market-performance claim.

| Source → target | Byte reduction on fixture | Encode time |
| --- | ---: | ---: |
| JPEG → WebP | 78.73% | ~32 ms |
| JPEG → AVIF | 89.36% | ~234 ms |
| PNG → WebP | 84.20% | ~28 ms |
| PNG → AVIF | 91.71% | ~240 ms |

On this fixture AVIF produced smaller files but took roughly 5–8× longer to encode than WebP. A broader real-image corpus is required before publishing comparative commercial claims.

## Release status

**Technical candidate.** Public npm/registry distribution and a hosted endpoint are not claimed on this page until they actually exist and pass their own release gate.

For implementation details, tool inputs, examples, privacy boundaries, and known limitations, see the [Website Image Optimizer MCP documentation](/docs/mcp/website-image-optimizer/).
