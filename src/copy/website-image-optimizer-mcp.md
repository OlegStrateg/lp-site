# Website Image Optimizer MCP

**Optimize website images with AI agents: analyze page images, compress and resize safely, generate responsive variants, and verify before/after results.**

LayerPorter Website Image Optimizer is a public Model Context Protocol server for website image optimization. It gives MCP-compatible AI agents bounded tools for inspecting image usage, optimizing selected images, generating responsive variants, and comparing results before anything is applied to production.

Current public npm version: **0.1.2 — verified**. No account or API key is required for the local stdio package.

## Install Website Image Optimizer MCP

```bash
npx -y @layerporter/image-optimizer-mcp@latest
```

[Open the npm package →](https://www.npmjs.com/package/@layerporter/image-optimizer-mcp)

- Node.js: `>=22.12.0`
- transport: `stdio`
- accepted inputs: JPEG, PNG, WebP
- available outputs: JPEG, PNG, WebP, AVIF

### MCP client configuration

For MCP clients that use the common JSON stdio configuration shape:

```json
{
  "mcpServers": {
    "layerporter-image-optimizer": {
      "command": "npx",
      "args": ["-y", "@layerporter/image-optimizer-mcp@latest"]
    }
  }
}
```

Client configuration formats vary. If your client uses a different format, use the same `npx` command and package arguments.

## Try these prompts

You do not need to call tool names manually. A compatible agent can choose the appropriate tool from the request.

- “Analyze the images on this public page and show me which files can be optimized.”
- “Optimize this image for web at a maximum width of 1600px without accepting a larger file.”
- “Generate responsive image variants at 480, 768, 1200 and 1600px without upscaling.”
- “Compare the original and optimized image and show the byte savings and any guard failures.”

## Optimize website images with AI agents

The MCP server separates analysis from modification. An agent can inspect normalized page-image facts or a bounded set of static `<img>` resources from a public HTTP(S) page, then optimize only the images selected for processing.

For browser-aware workflows, callers can provide intrinsic and rendered dimensions, DPR, `srcset`, `sizes`, loading priority and confirmed LCP evidence. For URL-only workflows, the server uses a narrower read-only static HTML mode.

The result is a deterministic chain:

`PAGE OR URL INPUT → IMAGE FACTS → POLICY → VERIFIED CANDIDATE → TEMPORARY RESOURCE → BEFORE/AFTER EVIDENCE`

## Compress and resize website images safely

`optimize_image` and the bounded batch workflows can resize and recompress supported images. The default policy prevents upscaling and uses `neverIncreaseBytes`, so a candidate that is larger than the source is rejected instead of being presented as an improvement.

That is a byte-size guard, not a universal visual-quality or SEO guarantee. The server also preserves alpha where applicable, normalizes EXIF orientation, retains ICC profile information when supported by the pipeline, and enforces decoded-pixel limits.

## Generate responsive image variants

`generate_responsive_variants` creates up to six requested width variants without upscaling. This is useful when an agent needs multiple image sizes for responsive delivery.

The tool generates the image variants themselves. It does **not** claim to generate final `srcset` or `<picture>` markup for your application.

## Analyze images from a website URL

`analyze_url_images` can fetch a public HTTP(S) page through an SSRF-protected read-only network boundary and inspect a bounded set of static `<img>` sources.

`optimize_url_images` can fetch those discovered images and recompress accepted candidates at their original dimensions. It never writes the result back to the website.

URL mode is intentionally not a browser crawler. It does not claim:

- browser-rendered dimensions;
- browser-selected `currentSrc`;
- live LCP measurement;
- CSS background-image discovery;
- JavaScript-driven lazy content.

## Why use a specialized image optimization MCP?

A generic shell or image library can transform files, but an AI agent also needs a predictable contract around what may be read, what may be changed, what counts as an accepted result, and how the result is returned.

LayerPorter adds bounded tool contracts, deterministic image guards, before/after evidence, temporary MCP resources, and a deliberately read-only website boundary. The current server does not expose arbitrary shell execution or autonomous production writes.

## Seven MCP tools

### `analyze_page_images`
Analyzes normalized page-image facts supplied by the caller and returns deterministic findings.

### `optimize_image`
Optimizes one caller-provided image with bounded resize and format policy. Accepted output is exposed as a temporary MCP resource.

### `generate_responsive_variants`
Generates a bounded responsive set without upscaling. Maximum: 6 requested variants.

### `compare_image_versions`
Compares original and candidate versions for byte savings and guard regressions.

### `optimize_page_images`
Processes an already-selected bounded batch of SAFE image items. Maximum: 20 images per call.

### `analyze_url_images`
Safely fetches a public HTTP(S) page and inspects a bounded set of static `<img>` sources.

### `optimize_url_images`
Safely fetches a public HTTP(S) page and recompresses a bounded set of discovered images at their original dimensions.

## Artifact delivery

Accepted optimized binaries are not embedded in the initial tool text. The result contains an MCP `resource_link`; a compatible client can call `resources/read` to retrieve the resource blob and verify MIME type, byte length and SHA-256 metadata.

Resources are temporary and process-local, not permanent public download URLs.

## Safety boundary

The current stdio server:

- never writes to a website or production environment;
- restricts network access to the two URL tools;
- blocks unsafe schemes, URL credentials, localhost/private/link-local/reserved addresses, unsafe DNS answers and redirects to prohibited targets;
- bounds page bytes, per-image bytes, accepted total image bytes, redirects, timeouts, image count and concurrency;
- stores accepted artifacts only in an isolated temporary store;
- does not execute arbitrary shell commands or perform arbitrary filesystem mutation;
- does not modify checkout, forms, analytics, authentication, backend code, pricing, positioning, or business logic.

`ACCEPT` means the candidate passed the implemented deterministic guards. It is not a guarantee of visual identity, SEO improvement, LCP improvement, or Core Web Vitals improvement.

## Format policy

WebP is the conservative automatic baseline for JPEG/PNG sources. AVIF is available as an output format when explicitly requested, but is not automatically selected solely because it can produce a smaller file.

HEIF/AVIF/TIFF/GIF/SVG and unknown formats are blocked as inputs by the current hardened input policy.

## Verified technical status

Public npm version **0.1.2** has been externally verified through a clean public installation, MCP initialization, an exact seven-tool `tools/list`, a real `optimize_image` call, and the temporary `resource_link → resources/read` artifact flow.

The package also has automated coverage for image-core transforms, MCP tool contracts, SSRF boundaries, temporary artifact integrity, and controlled URL ingestion.

Official MCP Registry publication is a separate distribution step and is **not** claimed as completed here.

## Frequently asked questions

### How do I optimize images for a website with AI?

Install the MCP package in a compatible stdio client, then ask the agent to analyze page-image facts, inspect a supported public URL, or optimize selected image inputs. The agent can use the registered image tools and return accepted artifacts with before/after evidence.

### Can it compress website images without increasing file size?

The default `neverIncreaseBytes` guard rejects an optimized candidate when it is larger than the source. That protects against a larger accepted output, but it does not guarantee a particular visual-quality score or percentage saving.

### Does it optimize images directly on my live website?

No. The current MCP is read-only with respect to websites. It can analyze public static page images and return temporary optimized artifacts, but it does not upload or apply changes to production.

### Does it generate responsive images?

Yes. It can generate up to six requested responsive width variants without upscaling. It currently returns the image variants; it does not claim to generate final application-specific `srcset` markup.

### Does it improve LCP or Core Web Vitals automatically?

No automatic guarantee is made. Optimizing oversized image assets can be one part of performance work, but URL mode does not measure live browser LCP and the package does not claim universal Core Web Vitals improvement.

## Release status

- public npm: **0.1.2 — verified**
- Official MCP Registry: **not yet claimed as published**
- hosted endpoint: **not included**
- production write/apply: **not included**

For exact inputs, resource behavior, security boundaries and limitations, see the [Website Image Optimizer MCP documentation](/docs/mcp/website-image-optimizer/).
