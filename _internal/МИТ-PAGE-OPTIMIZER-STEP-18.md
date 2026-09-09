# МИТ — PAGE OPTIMIZER — ШАГ 18/30

Дата: 2026-09-09
Issue: #191 / LP-079
Ветка: `feat/LP-079-image-mcp-release-contract`

## Зафиксировано

1. Канонический Official MCP Registry namespace: `com.layerporter/website-image-optimizer`.
2. Не публиковать временный дублирующий `io.github.OlegStrateg/...`, чтобы не дробить сущность продукта и не привязывать долгосрочный идентификатор к GitHub login.
3. npm package candidate: `@layerporter/image-optimizer-mcp@0.1.0`.
4. До подтверждения npm ownership и лицензии сохранять `private:true` + `UNLICENSED` как hard block.
5. Целевая npm-модель после bootstrap: Trusted Publishing через GitHub Actions OIDC + staged publish + ручное 2FA approval.
6. Долгоживущие npm write tokens не использовать как постоянную схему, если доступен Trusted Publishing.
7. Domain namespace `com.layerporter/...` публиковать только после domain-based auth `layerporter.com`; private key никогда не хранить в Git.
8. Release workflow по умолчанию dry-run и дополнительно заблокирован repository variable `LP_MCP_RELEASE_ENABLED=true`.
9. Для production publish использовать защищённое GitHub Environment `mcp-release`.
10. Перед релизом обязательны: version lock, tarball clean install, tests, stdio smoke, `mcp-publisher validate`.
11. npm provenance не обещать: текущий monorepo private, а npm Trusted Publishing provenance для public package требует public source repository. Целевой вариант — отдельный public release repo либо позднее изменение visibility отдельным решением.
12. Массовая обработка зафиксирована как будущая архитектура `MCP -> Job API -> Queue -> Workers -> Object Storage -> Verification DB`; текущий batch <=20 не трактовать как промышленный массовый runtime.
13. Для scale обязательны content-hash dedupe, idempotency, resumable jobs, retry/backoff, partial failure isolation, cache, per-file evidence, отдельный CPU budget AVIF и отсутствие передачи массовых binary payload через model context.

## Gate

`STEP 18 RELEASE CONTRACT = PASS`

Фактическая публикация остаётся заблокирована до account/legal/domain setup.
