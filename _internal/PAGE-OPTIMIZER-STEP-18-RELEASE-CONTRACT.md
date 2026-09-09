# LP-079 — Шаг 18/30: Release Contract для Website Image Optimizer MCP

Дата: 2026-09-09
Статус: RELEASE CONTRACT PREPARED / PUBLICATION BLOCKED UNTIL OWNERSHIP + LICENSE
Ветка: `feat/LP-079-image-mcp-release-contract`

## Цель

Подготовить безопасный и воспроизводимый контракт публикации `@layerporter/image-optimizer-mcp` и `com.layerporter/website-image-optimizer`, не публикуя пакет до подтверждения юридической модели, npm namespace и domain ownership.

## Зафиксированные решения

### 1. Канонический MCP namespace

Используем:

`com.layerporter/website-image-optimizer`

Не используем временно `io.github.OlegStrateg/...` как основной идентификатор.

Причина: GitHub namespace зависит от логина/организации. Доменный namespace стабильнее для долгосрочной идентичности LayerPorter и лучше соответствует общей entity-модели бренда.

### 2. npm package

Кандидат:

`@layerporter/image-optimizer-mcp@0.1.0`

До подтверждения владения npm scope пакет остаётся:

- `private: true`;
- `license: UNLICENSED`;
- не публикуется.

### 3. npm publish policy

Предпочтительная модель после bootstrap:

- npm Trusted Publishing через GitHub Actions OIDC;
- GitHub-hosted runner;
- `id-token: write`;
- публичный scoped package;
- staged publish как основной безопасный режим;
- ручное 2FA-approval перед фактическим публичным релизом;
- provenance автоматически только если repository/public package удовлетворяют требованиям npm.

Критический нюанс: текущий репозиторий private. npm provenance для public package из private GitHub repository не поддерживается. Поэтому provenance нельзя обещать до изменения repository visibility или выделения отдельного public release repository.

### 4. Official MCP Registry auth

Для `com.layerporter/...` нужен domain-based auth через DNS или HTTP.

В production release workflow:

- никакого приватного ключа в репозитории;
- private key только в защищённом GitHub Environment secret;
- namespace validation перед publish;
- `mcp-publisher validate` обязателен;
- registry publish запускается только после успешного npm release/stage state.

### 5. Hard release gates

Публичная публикация запрещена, если хотя бы один пункт не выполнен:

1. npm scope `@layerporter` подтверждён владельцем;
2. package name свободен/принадлежит нам;
3. лицензия определена и `UNLICENSED` снят;
4. `private` в package.json снят;
5. tarball clean-install PASS;
6. image-core tests PASS;
7. MCP contract tests PASS;
8. stdio smoke PASS;
9. `server.json` validate PASS;
10. domain auth для `layerporter.com` подготовлен;
11. release environment защищён;
12. версия package.json == server.json == release tag;
13. publication mode явно выбран человеком;
14. rollback/deprecation procedure описана.

## Bootstrap проблема npm Trusted Publishing

Trusted Publishing обычно настраивается для уже существующего package. Поэтому первый publish может потребовать bootstrap через интерактивную npm-авторизацию/2FA или иной поддерживаемый npm flow. После первого подтверждённого package ownership переводим публикацию на OIDC/staged workflow.

Нельзя оставлять long-lived write token как постоянный CI механизм, если Trusted Publishing доступен.

## Provenance

Целевое состояние:

`public release repository -> GitHub Actions OIDC -> npm public package -> provenance`

Текущее состояние:

`private monorepo -> provenance NOT GUARANTEED`

Решение до внешнего релиза:

- либо сделать отдельный public release repository только для MCP package;
- либо позже открыть релевантный repository;
- не менять приватность текущего monorepo автоматически.

## Массовая обработка — архитектурная оговорка

Интерактивный MCP batch (`<=20`) не является массовым runtime.

Будущий промышленный контур:

`MCP -> Job API -> Queue -> Workers -> Object Storage -> Verification DB`

Обязательные свойства:

- дедупликация по content hash;
- resumable jobs;
- idempotency keys;
- retry/backoff;
- bounded concurrency;
- отдельный AVIF CPU budget;
- WebP baseline;
- result cache;
- per-file evidence ledger;
- partial failure isolation;
- progress checkpoints;
- rollback/replay support;
- no model-context transport for image payloads at scale.

Это архитектурный контракт, не задача реализации шага 18.

## Release sequence

1. подтвердить npm scope ownership;
2. определить лицензию;
3. bootstrap первого npm package ownership;
4. включить npm Trusted Publisher;
5. подготовить domain auth для `layerporter.com`;
6. прогнать release-readiness workflow;
7. stage npm package;
8. проверить публичный artifact;
9. approve npm stage;
10. publish Official MCP Registry entry;
11. проверить discoverability;
12. только после этого менять внешний статус с `technical candidate` на `public release`.

## Статус шага

`RELEASE CONTRACT = PASS`

`PUBLICATION = BLOCKED BY ACCOUNT / LEGAL OWNERSHIP SETUP`
