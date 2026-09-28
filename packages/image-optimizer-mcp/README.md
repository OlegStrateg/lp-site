# LayerPorter Website Image Optimizer MCP

Public MCP server for website image analysis and safe image optimization.

## Install

```bash
npx -y @layerporter/image-optimizer-mcp@latest
```

- npm package: `@layerporter/image-optimizer-mcp`
- MCP server: `com.layerporter/website-image-optimizer`
- transport: `stdio`
- Node.js: `>=22.12.0`
- repository: `https://github.com/OlegStrateg/lp-site`
- product page: `https://layerporter.com/mcp/website-image-optimizer/`

The npm package is publicly available. Official MCP Registry publication is a separate distribution step and is not implied by npm publication.

## What it does

The server registers seven bounded tools:

- `analyze_page_images` — analyze caller-provided page/image facts;
- `optimize_image` — optimize one image;
- `generate_responsive_variants` — generate resized image variants without upscaling;
- `compare_image_versions` — compare image versions;
- `optimize_page_images` — optimize a bounded set of page images;
- `analyze_url_images` — inspect images referenced by static HTML at a public URL;
- `optimize_url_images` — fetch and optimize a bounded set of raster images referenced by static HTML.

Accepted optimized binaries are returned through temporary MCP `resource_link` values and read separately with `resources/read`.

## Input and output boundary

Untrusted image input is fail-closed:

- accepted input decoders: JPEG, PNG, WebP;
- blocked input decoders: HEIF/AVIF, TIFF, GIF, SVG, and unknown formats;
- AVIF remains available as an output format.

The optimizer applies bounded transformations and does not upscale images.

## URL mode limitations

URL mode is intentionally a fast static-HTML path. It does **not** claim to provide a browser-rendered audit.

It does not discover or measure:

- browser-selected `currentSrc`;
- real LCP;
- CSS background images;
- JavaScript-injected or lazy-loaded content that is absent from the fetched HTML;
- production page write/apply behavior.

Use it for bounded static discovery and optimization, not as a replacement for a browser runtime or Core Web Vitals measurement.

## Safety

The package:

- performs public HTTP(S) reads only through the two URL tools;
- blocks unsafe URL schemes, credentials, localhost/private/link-local/reserved destinations, unsafe DNS answers, and redirects to prohibited addresses;
- caps page bytes, image bytes, total accepted bytes, redirects, image count, timeouts, and concurrency;
- writes accepted output only to an isolated temporary artifact store;
- does not execute shell commands;
- does not perform arbitrary filesystem writes;
- does not modify a website or production environment.

Temporary artifacts are process-local and ephemeral. The default TTL is 30 minutes; cleanup is performed during store operations/disposal rather than at an exact wall-clock instant.

## Quick usage examples

After connecting the MCP server to a compatible client, requests can be framed around the task:

- “Analyze the images referenced by this page URL.”
- “Optimize this JPEG for web delivery without upscaling.”
- “Generate responsive variants for this image.”
- “Compare these two image versions and report the byte difference.”

Client-specific MCP configuration differs by product, so use the MCP client’s current documentation for its exact server configuration format.

## Verification

The release process verifies:

- package/server identity and version consistency;
- image-core and MCP tests;
- packed npm artifact metadata;
- clean installation of the packed tarball;
- stdio startup and MCP client handshake;
- exactly seven expected tools;
- real tool calls;
- temporary `resource_link` and `resources/read`;
- public-package source equivalence after publication.

## License

This package is proprietary LayerPorter software. The official unmodified package may be downloaded, installed, and used under the terms in `LICENSE`.

Copying beyond technically necessary installation/runtime copies, modification, derivative works, repackaging, redistribution, sublicensing, resale, and unauthorized hosting are prohibited. Third-party dependencies remain governed by their own licenses.

## Links

- Product: `https://layerporter.com/mcp/website-image-optimizer/`
- Documentation: `https://layerporter.com/docs/mcp/website-image-optimizer/`
- Repository: `https://github.com/OlegStrateg/lp-site`
- Issues: `https://github.com/OlegStrateg/lp-site/issues`

## Not included

- Official MCP Registry publication;
- hosted remote endpoint;
- full browser crawler/runtime metrics collection;
- production apply/write tools;
- universal performance, quality, or Core Web Vitals guarantees.
