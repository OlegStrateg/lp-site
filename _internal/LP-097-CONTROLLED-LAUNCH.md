# LP-097 — Controlled Launch

Статус: STEP 12/14 — PREPARED / BLOCKED ON EXTERNAL SECRET SETUP
Дата: 2026-09-11
Issue: #229
Draft PR: #231

## Цель

Запустить первый реальный PostingBoard pilot безопасно и доказуемо:

`REAL POSTINGBOARD READ → REAL MODEL TRIAGE/RESEARCH → DRY-RUN ONLY → VERIFY → HOURLY WORKER`.

Live-публикации остаются выключенными до отдельного подтверждённого gate внутри Step 12.

## Архитектура запуска

- runtime: отдельный Cloudflare Worker `layerporter-agent`;
- state: отдельный KV namespace `layerporter-agent-state`;
- cron: раз в час, UTC;
- `workers_dev = false`;
- публичного fetch-route нет;
- Worker не использует `FEEDBACK_KV`, Pages bindings или Pinterest state;
- secrets: только Cloudflare Worker Secrets;
- bootstrap: GitHub Actions использует уже существующие Cloudflare repository secrets;
- first real test: one-shot CLI с локальным временным JSON store и `dry-run`, чтобы немедленно проверить PostingBoard + OpenAI без внешней публикации.

## Bootstrap sequence

После merge в `master` deploy workflow выполняет:

1. Проверка наличия `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `OPENAI_API_KEY`.
2. Поиск KV namespace `layerporter-agent-state` через актуальный Cloudflare `/storage/kv/namespaces` API.
3. Если namespace отсутствует — создать ровно один.
4. Сгенерировать временный Wrangler config из versioned example, подставив KV ID.
5. Deploy Worker в `dry-run` с hourly cron.
6. Записать `OPENAI_API_KEY` в Worker Secret через stdin.
7. Проверить KV marker `bootstrap:postingboard_registered`.
8. Если marker отсутствует:
   - зарегистрировать `layerporter-agent` через PostingBoard `POST /v1/agents`;
   - API key никогда не печатать;
   - немедленно записать ключ в Worker Secret `POSTINGBOARD_API_KEY` через stdin;
   - только после успешного secret write записать KV marker;
   - выполнить one-shot реальный dry-run с тем же ключом;
   - удалить временный registration response и local memory.
9. Если marker уже существует — повторную регистрацию НЕ выполнять.
10. Повторный deploy Worker в `dry-run`, hourly cron.

## Fail-closed rules

- нет OpenAI key → launch workflow останавливается ДО PostingBoard registration;
- нет Cloudflare KV permission → останавливается ДО registration;
- Worker deploy failure → registration не выполняется;
- PostingBoard registration не вернул API key → marker не ставится;
- secret upload failure → marker не ставится;
- PostingBoard `409/name conflict` → не создаём другое имя автоматически;
- dry-run failure → live mode не включается;
- никакой deploy workflow не меняет `LAYERPORTER_AGENT_WRITE_MODE` на `live`.

## Почему registration идёт только после инфраструктурных проверок

PostingBoard показывает API key регистрации один раз. Нельзя сначала зарегистрировать аккаунт, а потом выяснить, что Worker/KV/secrets не готовы: ключ может быть потерян, а имя занято.

## Первый dry-run acceptance

PASS только если:

- `/v1/me` читается;
- Inbox/activity читаются;
- full messages hydrate до интерпретации;
- модель triage возвращает strict schema;
- максимум 3 кандидата попадают в research;
- research работает с bounded web search;
- actions фиксируются как `dry_run` / `blocked` / `save_only` / `defer` / `do_nothing`;
- PostingBoard write count = 0;
- cursor/metrics/run log сохраняются;
- никакие secrets/raw prompts/forum bodies не выводятся в workflow log.

## Live gate после dry-run

Перевод `dry-run → live` допускается только отдельным minimal diff после:

1. успешного real dry-run;
2. проверки минимум нескольких сгенерированных action proposals;
3. подтверждения отсутствия spam/marketing bias;
4. проверки attribution/identity текста;
5. проверки daily limits;
6. сохранения kill switch;
7. отдельного commit и CI.

На live v0.1:
- только reply;
- create_thread остаётся OFF;
- max 2 writes/run;
- max 6 writes/day;
- opportunity >= 0.62;
- evidence >= 0.70;
- source hash unchanged immediately before write;
- requestId persisted before write;
- exact read-back after write;
- uncertain write is terminal/manual-review state, не auto-retry.

## Единственный внешний prerequisite на текущем gate

В GitHub repository secret должен существовать `OPENAI_API_KEY` для отдельного API project/key LayerPorter Agent.

Raw key нельзя присылать в чат, issue, commit или обычный файл.

PostingBoard API key пользователь вручную создавать/копировать не должен: bootstrap безопасно регистрирует агента и сразу переносит одноразовый key в Cloudflare Worker Secret без вывода в лог.

## Не делать

- не использовать личный/общий OpenAI key, если можно выдать отдельный project key;
- не переиспользовать `FEEDBACK_KV`;
- не выставлять Worker public route;
- не включать `workers_dev`;
- не мержить PR до наличия OpenAI secret;
- не включать live writes вместе с первым deployment.
