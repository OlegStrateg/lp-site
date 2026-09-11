# LP-096 — independent review, 2026-09-11

Reviewed candidate: b1883d139854826595ffcde38bc106ba6c0ecf7d.
Base: ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb.
Verdict: M1 documentation, M2 README/source setup and M3 code change accepted within their scope. One remaining release-path blocker must be corrected before calling the release workflow ready.

## Independently confirmed

GitHub compare reports exactly one commit above the review base and 13 changed files.
[Run 34580628975](https://github.com/OlegStrateg/layerporter-site/actions/runs/34580628975) is SUCCESS at the exact candidate SHA. All five jobs succeeded: distribution-contract, source-setup, mcp-regression, tarball-client-smoke, public-pages-build.

GitHub artifact metadata confirms artifact 10191447221, name lp096-release-smoke-evidence, not expired at inspection, digest sha256:3694f9c47a61da29a9b37c04ca1548917ccb649fb3e33ecf522ede4c34d8a36a, associated with this run and SHA.

The reviewed tarball script packs the candidate, installs it outside the monorepo, uses the actual installed stdio server and official MCP client, performs initialize/tools/list, reads output resources, checks lengths/hashes and performs full pixel decoding. It is not merely a mocked tool response. M3 now checks and increments the accepted byte counter after inspectImage without an intervening await; invalid images do not consume accepted budget.

Review limits: no local execution or manual image opening by this reviewer; archive contents were not independently downloaded. CI status, artifact metadata and assertion code were inspected. This is not an independent security audit or a claim of compatibility with all clients.

## R1 — P1 for the existing release workflow: sync core still missing before tests

[.github/workflows/image-mcp-release.yml:76](https://github.com/OlegStrateg/layerporter-site/blob/b1883d139854826595ffcde38bc106ba6c0ecf7d/.github/workflows/image-mcp-release.yml#L76) still performs:

1. Install MCP dependencies.
2. npm test.
3. npm pack.

There is no sync:core between install and test. The package has no install/prepare/pretest hook that generates src/image-core; only prepack does so. On a clean checkout the existing release validation path therefore reaches imports of the absent generated core before packing can create it. This repeats the M2 source dependency problem in a different entry point.

The new lp096-release-review.yml explicitly syncs core and succeeds, so its green result does not cover this missing step in image-mcp-release.yml. This finding is based on the inspected workflow/package scripts; the old release workflow was not executed by this reviewer.

Minimal fix: insert npm run sync:core after dependency installation and before MCP tests in the existing release workflow. Then run its dry-run validation on the corrected SHA, keeping publication disabled. Keep the passing LP-096 regression and tarball checks.

## Evidence precision, not additional product scope

- Expiry and ARTIFACT_STORE_FULL checks in release-tarball-client-smoke.mjs instantiate the installed ArtifactStore directly. They are component checks, not those scenarios exercised via MCP resources/read. Real MCP reads cover accepted/repeated/unknown-resource paths.
- The fixture is synthetic flat-color data. Full pixel decode proves a decodable file, not broad perceptual quality.
- In-repo LP-096 result/МИТ documents record the pre-squash run and artifact. Keep final SHA/run/artifact evidence in issue #220 or another dated release ledger; avoid recursively rewriting a commit solely to insert its own resulting SHA.
- Public npm/Registry verification, hosted transport and deployment are not claimed.

## Handoff rule

The owner receives the ready-to-copy follow-up prompt and sends it to the execution chat. The reviewer does not send messages to other chats.

Next bounded task: fix R1, verify release dry-run and current candidate checks, record final evidence and return for review. Do not add new product features, publish, merge or deploy as part of that task.
