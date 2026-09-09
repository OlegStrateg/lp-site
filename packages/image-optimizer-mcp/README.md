# LayerPorter Website Image Optimizer MCP

Technical candidate for page-aware website image optimization through Model Context Protocol.

## Status

This package is not yet claimed as a public npm or Official MCP Registry release. The current implementation is verified in CI from repository source.

## Tools

- `analyze_page_images`
- `optimize_image`
- `generate_responsive_variants`
- `compare_image_versions`
- `optimize_page_images`

## Runtime

- Node.js `>=22.12.0`
- MCP v2 server package
- stdio transport
- image processing through `@layerporter/image-core` / Sharp / libvips

## Local source setup

From this repository branch:

```bash
cd packages/image-core
npm install --no-audit --no-fund
npm test

cd ../image-optimizer-mcp
npm install --no-audit --no-fund
npm test
node src/server.js
```

The last command starts the stdio MCP server and waits for a client connection.

## Safety boundary

The MCP package intentionally contains no:

- remote URL fetch;
- arbitrary filesystem write/delete/rename;
- shell execution;
- direct website or production mutation.

Inputs are caller-provided image buffers or normalized page facts. Batch and responsive operations are bounded.

Hard safety comes from implementation controls, not only from MCP metadata.

## Verification

The current technical gate was verified in GitHub Actions Run `34341457360` on Node `22.16.0`:

- image-core 17/17 tests PASS;
- MCP contracts 4/4 PASS;
- stdio startup PASS;
- deterministic engineering benchmark PASS.

## Public documentation

Canonical product page after site release:

- `https://layerporter.com/mcp/website-image-optimizer/`
- `https://layerporter.com/docs/mcp/website-image-optimizer/`

## Not yet included

- public npm release;
- Official MCP Registry publication;
- hosted endpoint;
- remote URL ingestion;
- production apply/write tool;
- universal performance or quality claims.
