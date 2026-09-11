# LP-096 — MCP Release Review Result

Дата: 2026-09-11
Репозиторий: `OlegStrateg/layerporter-site`
База review: `ea1e89d27e1b95e23ccb79b4393e5b3e367d3bfb`
Рабочая ветка: `fix/LP-096-mcp-release-review-m1-m3`
Issue: #220
Статус: **READY FOR INDEPENDENT REVIEW**. Это не публикация, не merge и не deploy.

## Что было проверено до исправления

### M1 — публичный контракт не соответствовал runtime

На базе `ea1e89d` сервер регистрировал 7 tools, включая `analyze_url_images` и `optimize_url_images`, но README/distribution всё ещё описывали 5 tools и отсутствие network fetches.

### M2 — clean source setup ломался без `sync:core`

RED-доказательство: GitHub Actions run `34515730765`, job `reproduce-m2`.

Чистая копия source tree без сгенерированного `packages/image-optimizer-mcp/src/image-core` выполняла последовательность до `npm test` и падала именно с `ERR_MODULE_NOT_FOUND` для `src/image-core/index.js`.

### M3 — parallel total accepted-image byte budget мог быть превышен

RED-доказательство: GitHub Actions run `34515603946` / повтор `34515730765`, job `reproduce-m3`.

Детерминированный тест: при `maxTotalImageBytes = 355` старый код принял `474` bytes, потому что два worker проверяли общий счётчик до `await inspectImage`.

## Исправления

### M1

Синхронизированы:

- `packages/image-optimizer-mcp/README.md`;
- `packages/image-optimizer-mcp/distribution/distribution-manifest.json`;
- `packages/image-optimizer-mcp/distribution/distribution-proof-ledger.json`;
- `src/copy/website-image-optimizer-mcp.md`;
- `src/copy/website-image-optimizer-mcp-docs.md`.

Зафиксировано:

- 7 bounded tools;
- network access существует только в двух URL tools;
- URL mode проходит через выделенную SSRF-protected boundary;
- HTTP fast mode не заявляет rendered size/currentSrc/LCP/CSS backgrounds/JS lazy content;
- accepted binary outputs выдаются как temporary `resource_link` и читаются отдельно через `resources/read`;
- production write отсутствует;
- accepted-total-image byte budget не рекламируется как строгий лимит всего сетевого трафика.

Добавлен `scripts/verify-distribution-contract.mjs`, который отклоняет возврат старых формулировок `5 tools` / `no network fetch`.

### M2

README теперь требует `npm run sync:core` до `npm test` и прямого запуска source server.

Добавлен `scripts/verify-source-setup.mjs`: создаёт чистую временную копию, удаляет generated MCP-local core и проходит фактическую source-последовательность, включая `sync:core`, MCP tests и реальный старт stdio server.

`npm pack` остаётся отдельным путём и сам запускает `sync:core` через `prepack`.

### M3

В `src/url-ingestion.js` accepted byte budget фиксируется только после успешного `inspectImage`. Проверка и увеличение `acceptedImageBytes` выполняются синхронно, без `await` между ними.

Регрессии:

1. два параллельных валидных изображения никогда не могут увеличить accepted bytes выше `maxTotalImageBytes`;
2. невалидный parallel image не резервирует accepted budget и не вытесняет валидный image.

## Главный release smoke

Скрипт: `packages/image-optimizer-mcp/scripts/release-tarball-client-smoke.mjs`.

Проверенная цепочка:

`npm pack → fresh temp dir outside monorepo → npm install tarball → real MCP stdio client initialize → tools/list → optimize_image → resource_link → resources/read → binary decode`

Проверенный клиент:

- package: `@modelcontextprotocol/client`;
- version: `2.0.0`;
- transport: `stdio`.

Не заявляется проверка Claude Desktop, ChatGPT или других MCP clients.

Фактический SUCCESS run до финального squash: `34580302134` на head `6da1f547176e1a58fd8a29d532a2c040e18e0ced`.

Все 5 jobs PASS:

- `distribution-contract`;
- `source-setup`;
- `mcp-regression`;
- `tarball-client-smoke`;
- `public-pages-build`.

### Проверяемый открываемый файл

Single optimize result:

- MIME: `image/webp`;
- dimensions: `320×240`;
- bytes: `216`;
- SHA-256: `7a1e54d7952a634cd44a7f7be1f986b6f3c41db87e13453f6ce0baf8a24e6d4f`;
- `sharp(...).metadata()` PASS;
- полный decode `sharp(...).raw().toBuffer()` PASS;
- повторный `resources/read` возвращает те же bytes PASS.

Batch:

- `400×300`, 294 bytes, SHA-256 `39f1a0809a5340c6207defc54ba916b6cfffcd3e3e3f3de561d56409a434d496`;
- `300×225`, 208 bytes, SHA-256 `93242ddd2883731157c02d9ff1550c3446fb53c39fa4e8d7bb6d62a374bee6f7`.

Responsive variants:

- `160×120`, 114 bytes, SHA-256 `2b80ab67dc1f8afe820fb53af122253b064b74afffc6920dfe606a284bdeea83`;
- `320×240`, 216 bytes, SHA-256 `7a1e54d7952a634cd44a7f7be1f986b6f3c41db87e13453f6ce0baf8a24e6d4f`;
- `640×480`, 626 bytes, SHA-256 `0a41172d2dd10a3dcab863f1af6441e9516193b77fbb6f34a9e6aef58aab218a`.

REJECT case:

- transparent PNG → forced JPEG with `preserveAlpha=true`;
- result `REJECT`;
- reason `alpha_would_be_lost`;
- resource links: `0`.

Temporary resources:

- repeated read PASS;
- unknown URI rejected;
- store limit returns `ARTIFACT_STORE_FULL`;
- expired URI rejected.

GitHub Actions evidence artifact for run `34580302134`:

- name: `lp096-release-smoke-evidence`;
- artifact ID: `10191315606`;
- archive SHA-256: `1c2efb7a09cce89fbac58523b8d06fe25e0a52e0fb3ce803430451fc8b4a1219`;
- contains JSON report plus six decoded `.webp` outputs.

## Exact verification commands

```bash
node packages/image-optimizer-mcp/scripts/verify-distribution-contract.mjs
node packages/image-optimizer-mcp/scripts/verify-source-setup.mjs

cd packages/image-optimizer-mcp
npm install --ignore-scripts --no-audit --no-fund
npm run sync:core
npm test
cd ../..

LP096_PROOF_DIR=/tmp/lp096-release-proof node packages/image-optimizer-mcp/scripts/release-tarball-client-smoke.mjs

npm ci --no-audit --no-fund
npx astro build
```

## Остаточные ограничения

- public npm package **не проверен**, потому что публикация не выполнялась;
- Official MCP Registry entry **не проверен**, публикация не выполнялась;
- hosted endpoint отсутствует;
- проверен официальный JS MCP client v2.0.0 по stdio, не весь рынок клиентов;
- URL mode остаётся static-HTML fast mode, не browser crawler;
- URL mode не измеряет rendered size/currentSrc/LCP;
- accepted-total-image budget ограничивает принятый набор, а не суммарный уже скачанный сетевой трафик;
- temporary resource process-local, TTL cleanup opportunistic, ссылка не persistent;
- нет production apply/write;
- ACCEPT означает прохождение реализованных guards, а не универсальную гарантию визуальной идентичности, SEO или CWV improvement.

## Release conclusion

**CODE/PACKAGE CANDIDATE: READY FOR INDEPENDENT REVIEW.**

M1/M2/M3 закрыты по воспроизводимым тестам. Clean tarball + real stdio client + `resource_link → resources/read` доказаны. Статус npm/Official Registry не повышается до отдельной внешней проверки после авторизованной публикации.
