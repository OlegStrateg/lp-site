# LayerPorter Website Image Optimizer MCP

Technical candidate for page-aware website image optimization through Model Context Protocol.

## Status

Version 0.1.0 is already public on npm. Version 0.1.1 is the security-hardening release candidate. Official MCP Registry publication is a separate step and is not implied by npm publication.

Registry identity:

- npm package: `@layerporter/image-optimizer-mcp`
- MCP server: `com.layerporter/website-image-optimizer`
- transport: `stdio`
- Node.js: `>=22.12.0`

The npm package carries `mcpName: com.layerporter/website-image-optimizer`, matching `server.json`, so the Official MCP Registry can verify package ownership after the package exists publicly on npm.

## Tools

The current server registers seven bounded tools:

- `analyze_page_images`
- `optimize_image`
- `generate_responsive_variants`
- `compare_image_versions`
- `optimize_page_images`
- `analyze_url_images`
- `optimize_url_images`

The first five operate on caller-provided image data or normalized page facts. The two URL tools perform bounded read-only HTTP(S) fetching through a dedicated SSRF-protected network boundary. URL mode is intentionally a fast static-HTML mode: it does not claim browser-rendered size, `currentSrc`, LCP, CSS-background discovery, or JavaScript-driven lazy content.

Accepted optimized binaries are exposed as temporary MCP `resource_link` values and are read separately with `resources/read`; they are not embedded in the initial tool text response.

## Runtime

- Node.js `>=22.12.0`
- MCP v2 server package
- stdio transport
- image processing through the shared image core / Sharp / libvips

## Local source setup

A source checkout does not contain the generated `src/image-core` copy. Sync it explicitly before MCP tests or direct server startup:

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

The last command starts the stdio MCP server and waits for a client connection. `npm pack` also runs `sync:core` through `prepack`; source setup and packed-artifact setup are verified separately.

## Installation

```bash
npx -y @layerporter/image-optimizer-mcp
```

## License

This package is proprietary LayerPorter software. The official unmodified package may be downloaded, installed, and used under the terms in `LICENSE`. Copying beyond technically necessary installation/runtime copies, modification, derivative works, repackaging, redistribution, sublicensing, resale, and unauthorized hosting are prohibited.

The software is licensed, not sold. Third-party dependencies remain governed by their own licenses.

## Release model

The first npm version is a bootstrap release: npm staged publishing and Trusted Publisher configuration require the package to already exist. The first public package therefore must be published by the package owner with npm account 2FA. After that bootstrap, GitHub Actions Trusted Publishing can be configured for `.github/workflows/image-mcp-release.yml`, and later versions can use the staged OIDC release path.

Official MCP Registry publication happens only **after** the matching npm version is publicly available. The Registry namespace uses ownership of `layerporter.com` and the server name `com.layerporter/website-image-optimizer`.

## Safety boundary

The current MCP package:

- accepts untrusted image input only as JPEG, PNG, or WebP; HEIF/AVIF, TIFF, GIF, SVG and unknown input decoders are fail-closed blocked; AVIF remains available as an output format;

- performs bounded public HTTP(S) reads only through `analyze_url_images` and `optimize_url_images`;
- blocks unsafe URL schemes, URL credentials, localhost/private/link-local/reserved targets, unsafe DNS answers and redirects to prohibited addresses;
- caps page bytes, per-image bytes, accepted total image bytes, redirects, image count, timeouts and concurrency;
- writes accepted image artifacts only to its isolated temporary artifact store;
- does not perform arbitrary filesystem write/delete/rename operations;
- does not execute shell commands;
- does not write to a website or production environment.

Local transform tools consume caller-provided image buffers or normalized page facts. URL tools are read-only open-world operations. Hard safety comes from implementation controls, not only from MCP metadata.

Temporary artifacts are process-local and ephemeral. Their default TTL is 30 minutes, but cleanup occurs during store operations/disposal rather than as a guarantee of physical deletion at an exact wall-clock instant. `resources/read` returns the resource blob separately; whether a client places that blob into model context is client-specific.

## Verification

Release preparation verifies:

- package/server identity consistency;
- proprietary license metadata and packaged `LICENSE` presence;
- image-core and MCP tests;
- packed npm artifact metadata;
- clean installation of the packed tarball;
- real stdio startup and client handshake from the packed artifact;
- `tools/list`, transform calls, temporary `resource_link` and `resources/read`;
- Official MCP Registry `server.json` validation;
- full LayerPorter Astro build in the integrated repository tree.

## Public documentation

Canonical product pages after site release:

- `https://layerporter.com/mcp/website-image-optimizer/`
- `https://layerporter.com/docs/mcp/website-image-optimizer/`

## Not yet included

- confirmed Official MCP Registry publication;
- hosted endpoint;
- full browser crawler/runtime metrics collection;
- production apply/write tool;
- universal performance or quality claims.
