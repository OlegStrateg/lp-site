# LP-097 — Current Repository Architecture Audit

Статус: STEP 3/14 — DONE
Issue: #229
Дата: 2026-09-11

## 1. Фактическая база

Repository: `OlegStrateg/layerporter-site`
Production/default branch: `master`
Baseline master на старте LP-097: `8ca11132b8cec267d1b88ff85232d58483353c63`
Рабочая ветка: `research/LP-097-agent-reputation`

Новый репозиторий не создаётся.
Branch rename `master → main` не выполняется в рамках LP-097.

## 2. Что реально существует в репозитории

### Root web application
- Astro site;
- Cloudflare Pages Functions;
- build/SEO/localization scripts;
- product analytics;
- public pages and product funnels.

Root `package.json` не является npm workspace-монорепо: он содержит зависимости сайта и root build scripts.

### `packages/`
На текущем baseline существуют два самостоятельных server-side пакета:
- `packages/image-core`;
- `packages/image-optimizer-mcp`.

`image-optimizer-mcp` уже использует собственные:
- `package.json`;
- `src/`;
- `tests/`;
- release/verification contour.

Это подтверждает существующий архитектурный паттерн: автономный backend/runtime компонент может жить в одном каноническом repository как отдельный package без загрязнения root web runtime.

### `.github/workflows/`
Существуют отдельные workflow для:
- Cloudflare Pages deploy;
- Image MCP release;
- Image MCP verify;
- PR build;
- analytics live gate.

Ни одного общего agent scheduler/runtime workflow на baseline нет.

### `functions/`
Cloudflare Pages Functions обслуживают site/API/internal web contour.

LP-097 не должен внедрять hourly autonomous social loop внутрь существующих Pages Functions: это смешает website request lifecycle и самостоятельный background runtime, расширит blast radius и усложнит секреты/rollback.

## 3. Найденное архитектурное ограничение

Нельзя помещать LayerPorter Agent:

### В `src/`
Причина: это web UI/site build surface.

### В `functions/api/`
Причина: Pages request handlers — не естественное место для автономного polling/scheduler loop; social-agent secret/write scope не должен смешиваться с production site API.

### В `scripts/`
Причина: текущие scripts — build/generation/verification helpers. Runtime с памятью и внешними write-actions не является build script.

### В `packages/image-optimizer-mcp/`
Причина: social-agent runtime не является функцией Image Optimizer MCP. Связывание создаст неправильную зависимость и размоет package boundary.

### В новом отдельном repository
Пока запрещено правилом anti-overengineering: один агент + одна сеть не создают достаточной причины для ещё одного repo/source-of-truth.

## 4. Минимальное правильное размещение

Рекомендуемый путь после Research Gate:

```text
packages/layerporter-agent/
  package.json
  src/
  tests/
  fixtures/
```

Это ОДИН пакет, не набор микропакетов.

Внутри него допустимы обычные модули:

```text
src/
  identity/
  policy/
  platforms/postingboard/
  research/
  memory/
  ranking/
  security/
  observability/
  cycle/
```

Не создавать отдельные npm packages для memory, adapters, ranking и т.п. до реального повторного использования.

## 5. Deployment boundary

Код может жить в каноническом repository, но runtime/deployment должен быть логически отделён от production сайта.

Требования к будущему execution environment:
- scheduled trigger / cron;
- outbound HTTPS;
- secret storage;
- persistent structured state;
- deterministic quotas;
- observable logs;
- no implicit access to Cloudflare Pages production bindings;
- independent disable/kill switch.

Конкретный runtime/provider НЕ выбран на Step 3. Он выбирается после Open Source First / platform review на Step 4.

## 6. Dependency boundary

`layerporter-agent` может читать только публично разрешённые знания о продукте или явно собранный sanitized knowledge snapshot.

Запрещена скрытая зависимость на:
- production database/bindings сайта;
- private browser-extension data;
- raw analytics/user data;
- image optimizer internal secrets;
- Cloudflare deploy credentials;
- GitHub write token.

Для технических ответов о наших продуктах knowledge layer должен ссылаться на проверяемые публичные/репозиторные факты и иметь provenance.

## 7. Reuse policy

На v0.1:
- PostingBoard — один adapter.

Если пилот пройдёт SCALE gate:
- добавляется `platforms/colony/` внутри того же package;
- общая memory/ranking/security логика переиспользуется.

Только если минимум два самостоятельных продукта/репозитория реально начнут использовать один и тот же agent runtime, можно обсуждать выделение отдельного `layerporter-agent-runtime` repository/package.

## 8. Что не менять в первой implementation branch

- root Astro pages;
- SEO title/meta/H1;
- sitemap/robots/canonical;
- existing Cloudflare Pages Functions;
- existing Image MCP behavior;
- extension code;
- production deployment workflow.

Первая implementation branch должна быть additive-only для agent package + его собственных tests/config/docs.

## 9. Три проверки архитектурного решения

### Проверка 1 — blast radius
Удаление `packages/layerporter-agent/` не должно менять сайт, MCP, extension или build output.

### Проверка 2 — dependency direction
Site/MCP не импортируют agent package. Agent может потреблять только явно разрешённые public/sanitized interfaces.

### Проверка 3 — kill switch
Отключение scheduler/runtime полностью прекращает внешнюю активность агента без изменения production LayerPorter.

## 10. Решение Step 3

KEEP канонический repository `OlegStrateg/layerporter-site`.

После Research Gate разместить MVP как один независимый `packages/layerporter-agent/`.

Не использовать website `src/`, `functions/api/` или `scripts/` как runtime агента.

Не создавать новый repository, framework или micro-package architecture.

Следующий шаг: 4/14 — Open Source First: проверить зрелые agent runtimes, scheduling/state варианты, PostingBoard clients/MCP, memory approaches и выбрать минимальную базу вместо написания собственного orchestration core.