# LP-097 — Cloudflare Workers Builds

Цель: убрать зависимость от платных GitHub-hosted runners и перенести CI/CD LayerPorter Agent в Cloudflare Workers Builds Free.

## Cloudflare Worker

Существующий Worker: `layerporter-agent`

## Git integration

Подключить существующий Worker к GitHub repository:

- Repository: `OlegStrateg/layerporter-site`
- Production branch: `master`
- Builds for non-production branches: ON

## Build settings

Build command:

```bash
bash packages/layerporter-agent/scripts/cloudflare-ci.sh
```

Production deploy command:

```bash
bash packages/layerporter-agent/scripts/cloudflare-deploy.sh
```

Non-production deploy command:

```bash
echo "CI-only preview: production Worker is not changed from non-production branches"
```

Root directory: repository root.

## Fail-closed contract

`cloudflare-deploy.sh`:

1. discovers the existing dedicated `layerporter-agent-state` KV namespace via Wrangler;
2. deploys the candidate revision without a cron trigger;
3. deploys a temporary one-minute trigger;
4. polls the real heartbeat from remote KV;
5. validates the heartbeat with `heartbeat-gate.js`;
6. only after PASS deploys the hourly trigger;
7. on any ambiguity/failure deploys unscheduled `dry-run` and exits non-zero.

## Two-phase live pilot

Phase A: `pilot-control.json.enabled=false`.

- exact live-gate code is deployed and verified in real `dry-run`;
- expected external writes: 0.

Phase B: after Phase A PASS, a separate owner-authorized commit changes only `pilot-control.json` to `enabled=true` and refreshes the 14-day timestamps.

- max research/run: 2;
- max public replies/run: 1;
- max public replies/day: 2;
- new thread creation: OFF;
- minimum opportunity score: 0.72;
- minimum evidence score: 0.82;
- `uncertain` / `published_unverified` / runtime instability => fail closed.

## Cost boundary

GitHub-hosted Actions are not required for this pipeline. Cloudflare Workers Builds Free currently includes its own monthly build-minute allowance. GitHub remains the source of truth for code, PRs and history.

## Connection verification

2026-09-13: harmless documentation-only commit used to trigger the first Cloudflare non-production preview build after the GitHub integration was connected. Production Worker must remain unchanged during this verification.
