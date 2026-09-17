# Website Image Optimizer MCP

**Page-aware image optimization for AI agents and developer workflows.**

LayerPorter Website Image Optimizer is a Model Context Protocol server that analyzes caller-supplied page facts or a bounded set of images discovered from a public HTTP(S) page, optimizes selected images with deterministic safety guards, generates responsive variants, and returns before/after evidence.

It is intentionally **not** a generic image editor, full browser crawler, CDN, hosted image service, or autonomous production writer.

## Security status

`@layerporter/image-optimizer-mcp@0.1.0` is public on npm, but that version is currently under a **security hold**.

Do not use `0.1.0` with untrusted image input. A separate security-hardened release is being validated before LayerPorter recommends new installations.

The public `0.1.0` package has been checked for source/package identity. That evidence confirms what was published; it is **not** a security clearance for untrusted image processing.

While this hold is active, this page intentionally provides no install command or install CTA for `0.1.0`. Official MCP Registry publication and a hosted MCP endpoint are also not claimed.

## What it solves

For browser-aware workflows, the caller can supply normalized page context including intrinsic/rendered dimensions, DPR, `srcset`, `sizes`, loading priority and confirmed LCP evidence. For a faster URL-only workflow, the MCP server can inspect static HTML and fetch a bounded set of public image URLs through a dedicated SSRF-protected read-only network boundary.

URL mode is deliberately narrower than browser mode: it does not claim rendered size, `currentSrc`, LCP, CSS-background discovery, or JavaScript-driven lazy content. It recompresses URL-discovered images at their original dimensions rather than inferring a resize from HTML attributes.

The result is a deterministic chain:

`PAGE OR URL INPUT → IMAGE FACTS → POLICY → VERIFIED CANDIDATE → TEMPORARY RESOURCE → BEFORE/AFTER EVIDENCE`

## Seven bounded MCP tools

### `analyze_page_images`
Analyzes an already-normalized page snapshot and returns deterministic image findings.

### `optimize_image`
Optimizes one caller-provided image with bounded resize and format policy. Accepted output is exposed as a temporary MCP resource.

### `generate_responsive_variants`
Generates a bounded responsive set without upscaling. Maximum: 6 requested variants.

### `compare_image_versions`
Compares original and candidate versions for byte savings and guard regressions.

### `optimize_page_images`
Processes an already-selected bounded batch of SAFE image items. Maximum: 20 images per call.

### `analyze_url_images`
Safely fetches a public HTTP(S) page and inspects a bounded set of static `<img>` sources. It is a fast HTTP mode, not a browser crawl.

### `optimize_url_images`
Safely fetches a public HTTP(S) page and recompresses a bounded set of discovered images at their original dimensions. Accepted outputs are exposed as temporary MCP resources; the tool never writes back to the website.

## Artifact delivery

Accepted optimized binaries are not embedded in the initial tool text. The result contains an MCP `resource_link`; a compatible client can then call `resources/read` to retrieve the resource blob and verify its MIME type, byte length and SHA-256 metadata.

Resources are temporary and process-local, not permanent public download URLs.

## Safety boundary

The current stdio server:

- never writes to a website or production environment;
- restricts network access to the two URL tools;
- allows only public HTTP(S) targets and blocks unsafe schemes, URL credentials, localhost/private/link-local/reserved addresses, unsafe DNS answers and redirects to prohibited targets;
- bounds page bytes, per-image bytes, accepted total image bytes, redirects, timeouts, image count and concurrency;
- stores accepted artifacts only in an isolated temporary store;
- does not execute shell commands or perform arbitrary filesystem mutation;
- does not modify checkout, forms, analytics, authentication, backend code, pricing, positioning, or business logic.

Image-core protections include no-upscale by default, `never-increase-bytes`, alpha preservation, EXIF orientation normalization, ICC profile retention, decoded-pixel limits, and allowlisted JPEG/PNG/WebP/AVIF output formats.

`ACCEPT` means the candidate passed the implemented deterministic guards. It is not a guarantee of visual identity, SEO improvement, or Core Web Vitals improvement.

## Format policy

WebP is the conservative automatic baseline for JPEG/PNG sources. AVIF is supported explicitly as an output format, but is not automatically selected solely because it can produce a smaller file.

Input-format hardening for the next release is being validated separately and is not claimed as part of public `0.1.0`.

## Verified technical status

The source candidate has automated coverage for image-core transforms, MCP tool contracts, SSRF boundaries, temporary artifact integrity, `resource_link → resources/read`, and controlled URL ingestion.

Public npm `0.1.0` has also been verified for source/package identity. That verification does not override the current security hold and does not make `0.1.0` a recommended install target.

The next security-hardened version must independently pass exact runtime tests, package/clean-install checks, MCP client/resource flow, security-negative tests, dependency review and external public-package read-back before its status can change.

## Benchmark status

Synthetic fixture numbers are engineering evidence only and must not be treated as universal savings or quality claims.

## Release status

**Public npm `0.1.0`: security hold.** Do not use it with untrusted image input.

A security-hardened replacement is pending verification. Official MCP Registry publication and a hosted endpoint remain unpublished, and this page does not recommend an install path until the replacement version passes its release gates.

For implementation details, tool inputs, privacy boundaries, compatibility and known limitations, see the [Website Image Optimizer MCP documentation](/docs/mcp/website-image-optimizer/).
