# МИТ — LP-093 Website Image Optimizer MCP Public Release Prep

Дата: 2026-09-10
Issue: #217
Recovery: `recovery/LP-092-pre-public-release-23cb9ca`
Рабочая ветка: `release/LP-093-image-mcp-public-prep`

## Задача

Подготовить Website Image Optimizer MCP к первому реальному публичному npm + Official MCP Registry релизу, не выдавая внешние действия за выполненные и не обходя владельца npm/domain/legal решений.

## Ключевые новые факты 2026-09-10

1. npm Trusted Publishing требует npm CLI >=11.5.1; staged publishing требует npm CLI >=11.15.0 и уже существующий package.
2. Новый package нельзя впервые создать через `npm stage publish`; первый publish — отдельный bootstrap владельцем package с 2FA.
3. Official MCP Registry для npm проверяет `mcpName` в опубликованном `package.json`; он должен точно совпадать с `server.json.name`.
4. Domain-auth namespace `com.layerporter/*` допустим для `layerporter.com`; DNS TXT размещается на apex домена.
5. Private GitHub repository не блокирует npm Trusted Publishing, но npm provenance для public package из private repository не генерируется.

## Принятые решения

- Не использовать долгоживущий npm automation token для первого bootstrap.
- Первый npm publish выполнить владельцем вручную с 2FA после юридического решения по лицензии.
- После появления package настроить Trusted Publisher на `.github/workflows/image-mcp-release.yml`.
- Для последующих версий использовать staged publishing через OIDC и human approval.
- Registry publish разрешать только после подтверждения exact npm version.
- Сохранить доменный MCP namespace `com.layerporter/website-image-optimizer`.
- Не выбирать MIT/Apache/proprietary лицензию без решения владельца; `UNLICENSED` остаётся hard blocker публикации.
- Не делать repository public только ради provenance без отдельного стратегического решения.

## Изменения

- снят `private=true` у npm candidate;
- добавлен `mcpName`;
- усилен `server.json`;
- добавлен deterministic `release:preflight`;
- release workflow обновлён под bootstrap reality, npm 11.15.0, exact-version gate и packed metadata checks;
- verification CI проверяет tarball identity и сообщает `PACKAGE_EXISTS` / `BOOTSTRAP_REQUIRED`;
- full session gate запускается на LP-093;
- README больше не создаёт впечатление, что npm/Registry release уже существует.

## Нельзя считать выполненным без внешнего доказательства

- npm scope ownership;
- npm package publication;
- Trusted Publisher setup;
- license decision;
- DNS TXT ownership setup;
- Registry login/publish/readback;
- public-source/provenance decision.

## Следующий Gate

После зелёных CI LP-093: дать владельцу минимальный список внешних действий. После первого npm bootstrap сразу проверить опубликованный package metadata, затем настроить OIDC и только после этого публиковать `server.json` в Official MCP Registry.
