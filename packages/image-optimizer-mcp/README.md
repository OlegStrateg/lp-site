# LayerPorter Website Image Optimizer MCP

Technical candidate for page-aware website image optimization through Model Context Protocol.

## Status

The package is release-prepared but is **not yet claimed as a public npm or Official MCP Registry release**. Publication status changes only after the exact npm version and Registry entry are externally verified.

Registry identity:

- npm package: `@layerporter/image-optimizer-mcp`
- MCP server: `com.layerporter/website-image-optimizer`
- transport: `stdio`
- Node.js: `>=22.12.0`

The npm package carries `mcpName: com.layerporter/website-image-optimizer`, matching `server.json`, so the Official MCP Registry can verify package ownership after the package exists publicly on npm.

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
- image processing through the shared image core / Sharp / libvips

## Local source setup

From this repository branch:

```bash
cd packages/image-core
npm install --no-audit --no-fund
npm test

cd ../image-optimizer-mcp
npm install --no-audit --no-fund
npm run release:preflight
npm test
node src/server.js
```

The last command starts the stdio MCP server and waits for a client connection.

## Installation after public release

Do not treat this command as available until the npm package has actually been published and verified:

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

The MCP package intentionally contains no:

- remote URL fetch;
- arbitrary filesystem write/delete/rename;
- shell execution;
- direct website or production mutation.

Inputs are caller-provided image buffers or normalized page facts. Batch and responsive operations are bounded.

Hard safety comes from implementation controls, not only from MCP metadata.

## Verification

Release preparation verifies:

- package/server identity consistency;
- proprietary license metadata and packaged `LICENSE` presence;
- image-core and MCP tests;
- packed npm artifact metadata;
- clean installation of the packed tarball;
- real stdio startup from the packed artifact;
- Official MCP Registry `server.json` validation;
- full LayerPorter Astro build in the integrated repository tree.

## Public documentation

Canonical product pages after site release:

- `https://layerporter.com/mcp/website-image-optimizer/`
- `https://layerporter.com/docs/mcp/website-image-optimizer/`

## Not yet included

- confirmed public npm release;
- confirmed Official MCP Registry publication;
- hosted endpoint;
- remote URL ingestion;
- production apply/write tool;
- universal performance or quality claims.
