# МИТ — LayerPorter Page Optimizer / LP-096

Дата: 2026-09-11
Статус: **готово к независимому ревью**
Публикация/merge/deploy: **не выполнялись**

## Решение

Перед выпуском Website Image Optimizer MCP закрыть ограниченное release review на базе `ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb` без расширения продукта.

В scope только:

1. привести README/distribution/public copy к фактическим 7 tools и URL network mode;
2. сделать source setup воспроизводимым из чистой среды через явный `sync:core`;
3. устранить race accepted-image total-byte budget;
4. доказать packed-artifact путь реальным stdio MCP client и открываемым binary resource.

За пределами scope:

- Chrome extension;
- hosted endpoint;
- полный browser crawler;
- deploy-agent;
- production write/apply;
- npm/Registry publication.

## RED → GREEN

### M2

RED: run `34515730765` — чистый source setup без generated `src/image-core` падал на `ERR_MODULE_NOT_FOUND`.

GREEN: README включает `npm run sync:core`; `verify-source-setup.mjs` проходит clean source copy, tests и stdio startup.

### M3

RED: run `34515603946` / `34515730765` — accepted `474 B` при budget `355 B`.

GREEN: budget commit происходит после successful `inspectImage`, check+increment без `await`; regression tests проверяют превышение и invalid-worker case.

### M1

GREEN: README, distribution manifest/ledger и public product/docs synchronized с 7 tools, bounded URL fetch и static-HTML limitations. Автоматизирован `verify-distribution-contract.mjs`.

## Release smoke

Run `34580302134` на `6da1f547176e1a58fd8a29d532a2c040e18e0ced` — SUCCESS.

Проверено:

- clean npm tarball install outside monorepo;
- official `@modelcontextprotocol/client` v2.0.0;
- stdio initialize;
- exact 7 tools;
- optimize → resource_link → resources/read;
- bytes/SHA-256/MIME/dimensions;
- full image decode;
- batch and responsive variants;
- REJECT without artifact;
- repeated/unknown/expired resources and store limits;
- public Astro pages build.

Evidence artifact: `lp096-release-smoke-evidence`, ID `10191315606`, archive digest `sha256:1c2efb7a09cce89fbac58523b8d06fe25e0a52e0fb3ce803430451fc8b4a1219`.

## Ограничения, которые нельзя подменять обещаниями

- npm и Official Registry всё ещё не опубликованы/не проверены;
- проверен только официальный JS MCP client v2.0.0 по stdio;
- URL mode — static HTML fast mode;
- accepted-image byte budget не равен aggregate network traffic cap;
- temporary resources не persistent;
- ACCEPT не означает доказанный SEO/CWV gain или универсальную perceptual equivalence.

## Следующий контроль

После squash итоговой ветки LP-096 в один commit от review-base повторить полный LP-096 Gate. При PASS — остановиться и передать на независимое ревью. До отдельной авторизации не публиковать, не merge и не deploy.
