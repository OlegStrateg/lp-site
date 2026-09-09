# LP-093 — чек-лист подготовки публичного релиза

Дата: 2026-09-10
Issue: #217

## Три независимых метода проверки

1. **Metadata / package identity** — `package.json`, `server.json` и содержимое npm tarball должны совпадать по имени, версии и `mcpName`.
2. **Runtime artifact** — tarball должен устанавливаться в чистую директорию и реально запускать stdio MCP binary.
3. **External contract** — `mcp-publisher validate` + фактическое определение npm bootstrap state + полный integrated site/session gate.

## Package / Registry

- [x] `private=true` снят.
- [x] `mcpName = com.layerporter/website-image-optimizer` добавлен.
- [x] `mcpName` совпадает с `server.json.name`.
- [x] npm identifier совпадает между package и server metadata.
- [x] версии совпадают во всех release metadata.
- [x] `publishConfig.access = public`.
- [x] canonical repository + monorepo directory зафиксированы.
- [x] server metadata содержит title, websiteUrl и repository subfolder.
- [x] deterministic `release:preflight` добавлен.
- [ ] Юридическая лицензия выбрана владельцем проекта; `UNLICENSED` пока является release blocker.

## npm bootstrap

- [x] Учтено актуальное правило npm: staged publishing требует уже существующий package.
- [x] Первый publish не автоматизируется token-based CI.
- [x] CI определяет `PACKAGE_EXISTS` / `BOOTSTRAP_REQUIRED` без ложного PASS.
- [ ] Владелец npm scope `@layerporter` подтверждён фактическим npm bootstrap.
- [ ] Первый `@layerporter/image-optimizer-mcp@0.1.0` опубликован владельцем с 2FA.
- [ ] После bootstrap настроен Trusted Publisher: GitHub `OlegStrateg/layerporter-site`, workflow `image-mcp-release.yml`, environment `mcp-release`.
- [ ] Для максимальной безопасности Trusted Publisher ограничен staged publishing, традиционные automation tokens не используются.

## MCP Registry domain auth

- [x] namespace `com.layerporter/website-image-optimizer` соответствует reverse-DNS домену layerporter.com.
- [x] release workflow требует exact npm version перед Registry publish.
- [x] release workflow требует `MCP_PRIVATE_KEY` только в protected release environment.
- [ ] DNS ownership keypair создан вне репозитория.
- [ ] Публичный ключ добавлен TXT-записью на apex `layerporter.com` по формату MCP Registry.
- [ ] Приватный ключ сохранён как GitHub environment secret `MCP_PRIVATE_KEY`.
- [ ] Реальный `mcp-publisher login dns` проверен.
- [ ] Registry entry опубликован и затем прочитан обратно из Official Registry.

## Проверки кандидата

- [ ] Image MCP CI на финальном LP-093 HEAD SUCCESS.
- [ ] npm bootstrap state зафиксирован из CI.
- [ ] image-core tests PASS.
- [ ] MCP tests PASS.
- [ ] npm pack PASS.
- [ ] packed metadata PASS.
- [ ] clean install PASS.
- [ ] stdio smoke PASS.
- [ ] `mcp-publisher validate` PASS.
- [ ] full Page Optimizer session / Astro build PASS.
- [ ] master не сдвинулся относительно интеграционной базы либо выполнен новый integration gate.

## Release truth

До фактического npm publish нельзя писать, что пакет доступен через npm.
До фактического Registry publish нельзя писать, что MCP присутствует в Official MCP Registry.
До настройки Trusted Publisher нельзя писать, что OIDC release path активен.

Предварительный статус: **RELEASE PREPARED / EXTERNAL BOOTSTRAP BLOCKED**.
