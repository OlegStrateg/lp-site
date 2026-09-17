# LayerPorter Website Image Optimizer MCP

Page-aware website image analysis and bounded image optimization through Model Context Protocol.

## Status

The npm bootstrap release `@layerporter/image-optimizer-mcp@0.1.0` is public.

That does **not** mean every client combination has been verified, and it does not mean the server is listed in the Official MCP Registry. LayerPorter treats public-package verification, client compatibility and Registry publication as separate gates.

Current identity:

- npm package: `@layerporter/image-optimizer-mcp`
- MCP server: `com.layerporter/website-image-optimizer`
- transport: `stdio`
- Node.js: `>=22.12.0`
- license: proprietary LayerPorter software

The npm package carries `mcpName: com.layerporter/website-image-optimizer`, matching `server.json`.

## Install from npm

The public developer install path is:

```bash
npx -y @layerporter/image-optimizer-mcp@0.1.0
```

Client-specific compatibility is claimed only after that exact package/version has been independently tested in the relevant client and operating-system combination.

## Tools

The current server registers seven bounded tools:

- `analyze_page_images`
- `optimize_image`
- `generate_responsive_variants`
- `compare_image_versions`
- `optimize_page_images`
- `analyze_url_images`
- `optimize_url_images`

The first five operate on caller-provided image data or normalized page facts. The two URL tools perform bounded read-only HTTP(S) fetching through a dedicated SSRF-protected network boundary.

URL mode is intentionally a fast static-HTML mode. It does not claim browser-rendered size, `currentSrc`, LCP, CSS-background discovery, or JavaScript-driven lazy content.

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

## Security and privacy

The package has a deliberately bounded capability surface:

- no shell or arbitrary command execution;
- no arbitrary filesystem read/write/delete/rename tools;
- no production website mutation;
- bounded public HTTP(S) GET only through the two URL tools;
- SSRF protections for schemes, credentials, localhost/private/reserved targets, DNS answers and redirects;
- bounded response sizes, redirects, image counts, timeouts and concurrency;
- generated binaries stored only in an isolated temporary artifact store;
- no LayerPorter account or LayerPorter API key required for the current local stdio package;
- no LayerPorter analytics/telemetry client in the current local `0.1.x` package.

Read the package-specific documents before using sensitive content:

- `SECURITY.md`
- `PRIVACY.md`

The MCP client and model provider may have their own logging, retention, training and privacy behavior. LayerPorter does not control those client/provider policies.

## License

This package is proprietary LayerPorter software. The official unmodified package may be downloaded, installed, and used under the terms in `LICENSE`. Copying beyond technically necessary installation/runtime copies, modification, derivative works, repackaging, redistribution, sublicensing, resale, and unauthorized hosting are prohibited.

The software is licensed, not sold. Third-party dependencies remain governed by their own licenses.

## Release model

The first npm bootstrap release has been completed for version `0.1.0`.

Future releases may use the staged GitHub Actions / npm trusted-publishing path only after the relevant release workflow and package identity are verified. A future release must not silently replace an already published version.

Official MCP Registry publication is a separate owner-gated action. Registry publication occurs only after the matching public npm artifact has passed the required external verification gate.

## Safety boundary

The current MCP package:

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

Release preparation verifies the source/package candidate with multiple independent layers, including:

- package/server identity consistency;
- proprietary license metadata and packaged `LICENSE` presence;
- image-core and MCP tests;
- packed npm artifact metadata;
- clean installation of the packed tarball;
- real stdio startup and MCP client handshake;
- `tools/list`, transform calls, temporary `resource_link` and `resources/read`;
- Official MCP Registry `server.json` validation;
- integrated LayerPorter site build.

Public npm availability is not treated as proof by itself. The public artifact has its own clean-install/source-equivalence/protocol verification gate, and client compatibility is recorded only after real client testing.

## Support and security reports

The package source repository is private because the package is proprietary. External users should not rely on the GitHub repository URL as a public support channel.

For bug reports, compatibility reports, privacy questions or security reports, use **hello@layerporter.com**. For security reports, use the subject `LayerPorter MCP security` and do not include credentials or private files.

## Public documentation

LayerPorter product and technical documentation is published on `layerporter.com` as each surface becomes production-ready. Do not infer that a page, client integration or Registry entry exists solely because it is mentioned in development metadata.

## Not yet claimed

- Official MCP Registry publication;
- hosted Remote MCP endpoint;
- OAuth-backed hosted connection;
- universal client compatibility;
- full browser crawler/runtime metrics collection;
- production apply/write tool;
- universal performance or quality claims.
