# LP-091 — чек-лист шага 30/30

Дата: 2026-09-10
Issue: #215

## Три независимых метода проверки

1. **Интеграционный Gate** — сравнить Page Optimizer с актуальным `master`, найти divergence и пересечения изменённых путей.
2. **Продуктовый Pareto Gate** — для каждого слоя определить фактический статус `READY / PREVIEW / BLOCKED`, не выдавая library/contract за готовую пользовательскую функцию.
3. **Технический и публикационный Gate** — повторно прогнать Image MCP, Page Audit Extension, public Astro pages и integrated session CI; сверить npm/MCP/Chrome release prerequisites с актуальными официальными требованиями.

## Проверки архитектуры

- [x] Безопасные image transforms отделены от production write.
- [x] `missing_image_dimensions` остаётся preview markup contract, а не скрытой DOM mutation.
- [x] Bounded Agent ограничен 1 finding/итерацию и 3 итерациями.
- [x] Continuous layer не исполняет действия и не хранит page text как управляющую память.
- [x] Hosted AI/API keys/network в Chrome extension отсутствуют.
- [x] Chrome permissions остаются `activeTab`, `scripting`, `sidePanel`.
- [x] Runtime extension запрещает broad access, network/write primitives и unsafe HTML rendering через CI.

## Интеграция с master

- [x] Текущий Page Optimizer branch основан на merge-base `84bc58ec2238f2dd874cf34c3a835af290924482`.
- [x] Актуальный `master` ушёл вперёд на 105 коммитов.
- [x] Feature contour ушёл вперёд от merge-base на 155 коммитов.
- [x] По изменённым путям прямого пересечения не обнаружено: master менял API/converter/localization/sitemap; Page Optimizer — отдельные packages/workflows/internal/MCP pages.
- [ ] **RELEASE BLOCKER:** собрать интеграционную ветку от актуального master и повторить весь Gate на объединённом дереве.

## Фактическая продуктовая готовность

- [x] `image-core` — технически READY как внутреннее детерминированное ядро.
- [x] Website Image Optimizer MCP — package/stdio/pack/clean-install/server.json технически проверены.
- [ ] MCP public release — BLOCKED: `private=true`, `license=UNLICENSED`, решение по публичному source/repository не принято, npm Trusted Publisher и MCP DNS publishing должны быть реально настроены и проверены.
- [x] Public MCP pages — технический candidate build есть.
- [ ] Public MCP pages deploy — BLOCKED до интеграции с актуальным master.
- [x] Page Audit Extension — read-only audit MVP реализован.
- [ ] Chrome Web Store release — BLOCKED до live-Chrome проверки, store/privacy/single-purpose disclosure и финальной сборки.
- [x] AI Fix Suggestions — deterministic request/response contract готов.
- [ ] Hosted AI — NOT IMPLEMENTED; нельзя заявлять как работающую пользовательскую функцию.
- [x] Safe image fix — engine candidate/verification готов.
- [ ] Реальная доставка/применение image artifact — NOT IMPLEMENTED.
- [x] Safe markup dimensions — preview plan + re-audit contract готов.
- [ ] Реальная mutation source/DOM — NOT IMPLEMENTED.
- [x] Bounded Agent — policy/enforcement contract готов.
- [ ] Agent executor/user runtime — NOT IMPLEMENTED.
- [x] Continuous Optimization — drift/state machine готова.
- [ ] Scheduler/storage/runtime auto-cycle — NOT IMPLEMENTED.

## Pareto-решение по первому релизу

- [x] Не выпускать «полный автономный Page Optimizer» сейчас.
- [x] Первый внешний технический кандидат: **Website Image Optimizer MCP** после закрытия package/license/source/integration prerequisites.
- [x] Второй кандидат: **Page Audit Extension — read-only beta**, только после реального Chrome теста и CWS compliance pass.
- [x] Safe Fix / Agent / Continuous оставить внутренними до end-to-end wiring, preview/apply/rollback и live verification.

## Финальный Gate

- [ ] Все четыре CI шага LP-091 SUCCESS.
- [ ] Финальная release matrix зафиксирована.
- [ ] MIT шага 30 зафиксирован.
- [ ] Issue #215 содержит финальный результат.

Текущий общий статус до завершения CI: **ROADMAP IMPLEMENTATION COMPLETE / PUBLIC RELEASE BLOCKED**.
