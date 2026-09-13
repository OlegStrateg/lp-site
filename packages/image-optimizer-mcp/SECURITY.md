# Security — LayerPorter Website Image Optimizer MCP

This document describes the security boundary of the local stdio package `@layerporter/image-optimizer-mcp` for the current `0.1.x` line.

## Security model

The package is intentionally narrow. It does not provide a shell, arbitrary command execution, generic filesystem access, website deployment, or production mutation.

The current MCP surface contains seven bounded tools. Local transform tools operate on image bytes or normalized page facts supplied by the caller. URL tools perform bounded read-only HTTP(S) retrieval of public pages and image resources.

### Tool classes

| Tool | External network | Production/site write | Destructive | Open-world |
| --- | --- | --- | --- | --- |
| `analyze_page_images` | No | No | No | No |
| `optimize_image` | No | No | No | No |
| `generate_responsive_variants` | No | No | No | No |
| `compare_image_versions` | No | No | No | No |
| `optimize_page_images` | No | No | No | No |
| `analyze_url_images` | Yes, bounded HTTP(S) GET | No | No | Yes |
| `optimize_url_images` | Yes, bounded HTTP(S) GET | No | No | Yes |

Accepted optimized binaries are written only to the package's isolated temporary artifact store and exposed through temporary MCP `resource_link` values. This is local working-state creation, not a write to the target website or another external system.

## Network boundary

The URL tools use a dedicated SSRF-resistant fetch path. The implementation:

- allows only `http:` and `https:` URLs;
- rejects credentials embedded in URLs;
- rejects localhost, private, link-local, reserved and other non-routable address ranges;
- validates DNS answers and rejects a hostname when any returned address is prohibited;
- re-validates redirect destinations;
- limits redirects, response bytes, image count, total accepted image bytes, request timeouts and concurrency;
- uses direct GET requests only and does not authenticate to target sites.

The target website and image hosts can still observe ordinary network metadata from the machine running the MCP, including its public IP address and the LayerPorter user-agent string. Do not use URL tools for hosts you are not permitted to access.

## Filesystem boundary

The package does not expose arbitrary filesystem read/write/delete/rename tools.

Generated artifacts are stored under the operating system temporary directory by default. The artifact directory is created with owner-only permissions (`0700`) and artifact files with owner-only permissions (`0600`). Artifact identifiers are random, the in-memory index is process-local, and reads verify stored size and SHA-256 integrity.

The default artifact TTL is 30 minutes. Expired artifacts are removed during store activity and disposal on a best-effort basis; the package does not promise physical deletion at an exact wall-clock instant.

## MCP and model boundary

`resources/read` returns a binary resource to the MCP client. Whether that client places the resource, tool text, prompts, or other inputs into a remote model context is controlled by the client and model provider, not by this package.

Review the privacy and data-use settings of the MCP client and model provider you use.

## Known scope limits

The current URL mode is static HTTP analysis. It does not execute page JavaScript and does not claim browser-rendered dimensions, `currentSrc`, CSS background discovery, browser LCP, or full runtime performance metrics.

Image decoding and encoding use Sharp/libvips. Keep Node.js and package dependencies current and do not process untrusted files outside the limits of your own environment.

The current package is proprietary LayerPorter software. It is not presented as an open-source security-review surface.

## Reporting a security issue

Send security reports to **hello@layerporter.com** with the subject `LayerPorter MCP security`.

Please include, where practical:

- affected package version;
- operating system and Node.js version;
- MCP client and client version;
- minimal reproduction steps;
- expected and observed behavior;
- whether the issue may expose data, escape the bounded filesystem/network model, or enable unintended writes.

Do not include API keys, authentication tokens, cookies, private user files, or other secrets in the report. If a report describes a potentially exploitable vulnerability, avoid publishing exploit details before LayerPorter has had a reasonable opportunity to investigate.

## Verification policy

Compatibility and security claims are made only for versions and client combinations that have been explicitly tested. A package being present on npm or listed by a directory is not, by itself, treated as proof of runtime compatibility or security.
