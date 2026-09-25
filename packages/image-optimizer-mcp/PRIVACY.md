# Privacy — LayerPorter Website Image Optimizer MCP

This document covers the local stdio package `@layerporter/image-optimizer-mcp` in the current `0.1.x` line. It is separate from the LayerPorter website privacy policy.

## Local processing model

The current MCP package runs locally through stdio. It does not require a LayerPorter account, LayerPorter API key, or hosted LayerPorter MCP endpoint.

The `0.1.x` local package does not include a LayerPorter analytics or telemetry client. Image bytes supplied to local transform tools are processed in the local Node.js process.

## Tool data flow

### Local transform tools

These tools do not fetch external URLs:

- `analyze_page_images`
- `optimize_image`
- `generate_responsive_variants`
- `compare_image_versions`
- `optimize_page_images`

They receive caller-provided image bytes or normalized page facts through the MCP client. Accepted optimized outputs are written to a local temporary artifact store so the MCP client can retrieve them through `resources/read`.

### URL tools

These tools perform direct bounded HTTP(S) GET requests from the machine running the MCP:

- `analyze_url_images`
- `optimize_url_images`

The requested website and discovered image hosts may receive ordinary network information such as the machine's public IP address, request timing, and the LayerPorter user-agent string. Those third parties may process or log requests under their own policies.

LayerPorter does not proxy these `0.1.x` URL requests through a LayerPorter-hosted service.

## Temporary artifacts

Generated image artifacts are stored under the operating system temporary directory by default.

Current defaults and controls include:

- owner-only artifact directory permissions (`0700`);
- owner-only artifact file permissions (`0600`);
- random artifact identifiers;
- process-local artifact index;
- SHA-256 and byte-length verification when an artifact is read;
- default 30-minute TTL;
- bounded artifact count and byte budgets.

Cleanup occurs during artifact-store activity and process disposal on a best-effort basis. Exact physical deletion at a precise wall-clock time is not guaranteed.

## MCP client and model provider

The MCP client decides what tool inputs, outputs, resource contents, prompts, and conversation context are sent to a model provider.

LayerPorter does not control the privacy, retention, training, logging, or account policies of Claude, ChatGPT, Cursor, VS Code, or another MCP client/model provider. Review the settings and policies of the client and provider you choose before sending sensitive content.

## Credentials and secrets

The current local package does not require LayerPorter credentials. URL credentials embedded directly in a URL are rejected by the network boundary.

Do not place passwords, API keys, cookies, bearer tokens, private signed URLs, or other secrets into tool arguments unless a future documented feature explicitly requires them and provides an appropriate security model.

## Hosted and OAuth versions

A future Remote MCP or OAuth-backed LayerPorter service would have a different data flow and would require an updated privacy disclosure before release. This document must not be used to imply that a future hosted service has the same local-only processing model.

## Contact

Privacy questions about the MCP package can be sent to **hello@layerporter.com**.

The general LayerPorter privacy policy is available at `https://layerporter.com/privacy/`.
