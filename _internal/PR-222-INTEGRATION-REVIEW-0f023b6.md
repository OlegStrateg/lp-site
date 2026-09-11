# PR #222 — integration review

Reviewed head: 0f023b62bdff36fd817ea87a0556a0ab9b181be7.
PR: https://github.com/OlegStrateg/layerporter-site/pull/222
Accepted package candidate: 7f8d970167d27789856166893b36b254e2259ecb.

## Confirmed

PR is open, mergeable and unmerged, targets master, changes 45 files.
Image MCP Verify run 34618366213 is SUCCESS at this PR head.
Complete, non-truncated Git trees were compared. Every file under packages/image-optimizer-mcp is identical to the accepted candidate. Under packages/image-core the only difference is removal of tests/safe-fix-verification.test.js. The page-audit-extension directory is absent from the integration tree.

The separation of unrelated Page Audit Extension work is reasonable. LP-096 runtime acceptance remains valid; the integration introduces the dependency mismatch below.

## I1 — P2: source-setup smoke retains removed package dependency

packages/image-optimizer-mcp/scripts/verify-source-setup.mjs still unconditionally calls copyPackage('page-audit-extension'). That helper calls fs.cp on a directory absent from the new integration tree. Invoking the clean-source smoke from this PR will fail with a missing-path error before source setup is verified. This is a static finding; the reviewer did not execute the script.

.github/workflows/image-mcp-verify.yml runs unit tests, a source-package protocol smoke and a packed-package startup check. It does not execute verify-source-setup.mjs or release-tarball-client-smoke.mjs, explaining why its success does not detect I1 or reproduce the full accepted tarball/client proof on the integrated tree.

Minimal follow-up: remove the obsolete copy requirement without bringing Page Audit Extension back. Run clean source setup and the existing full tarball/client smoke at the corrected PR head; add these checks to the existing package CI so integration retains the accepted verification path. No new product features or broad audit required.

## Release boundary

The inspected cloudflare-pages-deploy.yml triggers on push to master and deploys both Cloudflare Pages and the Pinterest queue worker. A merge therefore initiates production deployment; it is not a docs-only or package-only side effect.

No merge, publish, deployment or cross-chat message was performed by this review. After I1 closes, the next owner decision is authorization for integration with that deployment consequence, followed by native dry-run and separately authorized public release.

## Follow-up review — f651add6ef3abff570be9e9d72a95a1518795c4a

I1 removed-package dependency: CLOSED. Compared against 0f023b6: exactly two changed files. The obsolete copy is removed; existing verify workflow now invokes both clean-source and full tarball/client scripts and uploads evidence.

Confirmed through GitHub API: PR head f651add6, open and unmerged; build 34620061851 and verify 34620061833 completed successfully. Both new smoke steps and artifact upload report success. Artifact 10271727841 has digest sha256:097f6cdab36d514b944157d4273364be9ee723358e0f6a66551e007368b3291f and is linked to that head. Its name uses the PR merge ref SHA 398b164e4ac1ef4e70758b18e8a1ecdc01460bdd, consistent with default pull_request checkout. Reviewer did not download the archive or rerun/decode images; archive contents and decoded-image details remain implementer evidence.

### I2 — P2: new smoke pipelines can conceal nonzero test exits

The two new run commands pipe node output to tee. No step shell or defaults.run.shell is set in the complete workflow. GitHub's unspecified Linux shell is bash -e, without pipefail; pipeline success can therefore come from tee even if node failed. Artifact existence does not enforce the JSON success contract. This is a regression-gate defect, not evidence that the reported successful tests actually failed.

Reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax (jobs.<job_id>.steps[*].shell).

Minimal correction: add explicit shell: bash to the two new smoke steps, enabling GitHub's -eo pipefail invocation. Demonstrate a failing node command piped to tee returns nonzero under the same shell, then run the normal PR checks on the updated head. Keep this fix to the existing workflow; no runtime changes, new features or workflow proliferation. Record the result in PR 222 / issue 220.

Integration acceptance remains pending I2; prior package/runtime acceptance is unchanged. No merge/deploy/npm/Registry publish authorized or performed.

## Final integration acceptance — 3882582427b24776f5a93fcf5433438419ccb49f

I1: ACCEPTED / CLOSED.
I2: ACCEPTED / CLOSED.

I2 final diff adds only `shell: bash` to `Verify clean source setup` and `Verify clean tarball through MCP client and decoded resource`. The proof run demonstrated a non-zero pipeline result for an intentionally failing Node process piped through `tee`; the temporary proof step was removed from the final PR. Final PR checks on 3882582427b24776f5a93fcf5433438419ccb49f completed successfully, including the clean source setup and full tarball/client/resource proof.

PR #222 was subsequently merged to master as bdfeb1c320527ba6d5cd401f00d8422d1e87dcd3.

## RELEASE DRY-RUN — 2026-09-11

Current master checked before release validation: `8ca11132b8cec267d1b88ff85232d58483353c63`.

Compared with the MCP integration merge `bdfeb1c320527ba6d5cd401f00d8422d1e87dcd3`: the two later master commits change only Extract Audio files (`public/_headers`, `public/tools/extract-audio-from-video/processor.js`, `scripts/verify-extract-audio-tool.mjs`, `src/scripts/extractAudioTool.ts`). No `packages/image-core/**`, `packages/image-optimizer-mcp/**`, or MCP release workflow files changed after the accepted integration.

Native workflow `LP-079 Image MCP Release` was already executed and was not duplicated:

- run: https://github.com/OlegStrateg/layerporter-site/actions/runs/34636849459
- run id: `34636849459`
- ref: `master`
- actual checkout SHA: `8ca11132b8cec267d1b88ff85232d58483353c63`
- mode: `dry-run`
- expected version: `0.1.0`
- result: `SUCCESS`
- validate job: `SUCCESS`
- `stage-npm`: `SKIPPED`
- `publish-registry`: `SKIPPED`

The native dry-run passed candidate metadata, exact version lock, image-core tests, MCP dependency install, `sync:core` before MCP tests, MCP tests, package creation, packed metadata verification, clean installation/start from the packed candidate, and Official MCP Registry `server.json` validation.

Public MCP pages checked after the run:

- product: https://layerporter.com/mcp/website-image-optimizer/ — reachable and describes the bounded HTTP(S) URL mode and product boundaries;
- docs: https://layerporter.com/docs/mcp/website-image-optimizer/ — reachable and correctly states `technical candidate`; it does not claim npm or Official MCP Registry publication.

Public npm check:

- `https://registry.npmjs.org/@layerporter%2Fimage-optimizer-mcp` returned HTTP 404 during the release check;
- therefore `@layerporter/image-optimizer-mcp@0.1.0` is not publicly published as of this check;
- no npm or MCP Registry publication was performed by this stage.

Prepared next release step, not executed here: first npm bootstrap publish from the exact verified package at master SHA `8ca11132b8cec267d1b88ff85232d58483353c63`. Before publishing, run the publishable preflight and tests, then publish the scoped package publicly with `npm publish --access public`. The executing npm account must have publish rights for scope `@layerporter`; interactive npm publish must satisfy the account/package 2FA requirement.

MCP release validation does not test or accept Extract Audio functionality. Audio status is independent and must not be inferred from this release gate.
