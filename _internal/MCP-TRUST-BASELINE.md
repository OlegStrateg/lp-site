# LayerPorter MCP — базовый контур доверия

Дата: 2026-09-13
Статус: рабочее решение для линии `0.1.x`

## Цель

Доверие к MCP должно подтверждаться не маркетинговыми заявлениями, а проверяемыми границами возможностей, воспроизводимым релизом и независимыми тестами.

Основная последовательность:

`исходный SHA → пакет → внешний clean install → MCP client → Inspector → security/dependency gates → client matrix → Registry`

Official MCP Registry не считается доказательством безопасности, совместимости или пользовательской активации.

## Три обязательных способа проверки

1. **Проверка артефакта** — публичный npm tarball должен соответствовать разрешённому release SHA по файлам и SHA-256 содержимого.
2. **Проверка протокола** — реальный MCP client и официальный MCP Inspector должны независимо проходить initialize, tools/list и критический tool call.
3. **Проверка границ безопасности** — deterministic tests должны подтверждать SSRF-блокировки, лимиты, отсутствие произвольного shell/filesystem/production write и целостность временных артефактов.

Ни один из трёх способов не заменяет остальные.

## Публичный trust surface

Для пакета обязательны:

- `README.md` с фактическим статусом релиза;
- `SECURITY.md`;
- `PRIVACY.md`;
- `LICENSE`;
- публичный канал bug/security reports;
- package metadata, не отправляющая внешнего пользователя в недоступный приватный issue tracker;
- точное описание сетевых и файловых границ;
- отсутствие заявлений о совместимости с клиентом, пока нет живого теста exact client/version/OS.

Публичный контакт: `hello@layerporter.com`.
Публичный feedback route: `https://layerporter.com/feedback/?p=mcp&tool=website-image-optimizer`.

## Классификация текущих tools

### Закрытые локальные операции

- `analyze_page_images`
- `optimize_image`
- `generate_responsive_variants`
- `compare_image_versions`
- `optimize_page_images`

Они не делают внешних сетевых запросов и не меняют production. Оптимизированные результаты создаются только во временном локальном artifact store.

### Open-world read

- `analyze_url_images`
- `optimize_url_images`

Они выполняют ограниченные HTTP(S) GET-запросы. Для них обязательны SSRF-защита, DNS/redirect revalidation, byte/time/count/concurrency limits и отсутствие credentials-in-URL.

## Что нельзя заявлять

До отдельной проверки запрещено писать:

- «works with Claude/Cursor/VS Code/ChatGPT» без exact smoke;
- «Official Registry listed» до внешнего read-back;
- «open source» — текущий пакет proprietary;
- «no network» — два URL-tool имеют bounded network access;
- «artifacts deleted exactly after 30 minutes» — cleanup best-effort during store activity/disposal;
- «files never reach a model provider» — это определяется MCP client/provider;
- универсальные LCP/browser-performance claims для HTTP fast mode.

## Security scanner decision

### `mcp-scan`

Статус: **HOLD как обязательный release gate**.

Причина:

- стандартный scan передаёт tool names/descriptions во внешний Invariant verification service;
- local-only режим имеет отдельные зависимости/ключ модели и не является полностью автономным deterministic gate;
- добавлять стороннюю отправку metadata в release CI без отдельного решения противоречит принципу минимальной утечки.

Допустимый следующий тест:

1. изолированно проверить точную текущую версию scanner;
2. выяснить, можно ли получить полезный deterministic local result без внешней передачи и без секретов;
3. зафиксировать network behavior;
4. только после этого решить `KEEP / OPTIONAL / REJECT`.

До этого обязательными остаются:

- собственные security/unit tests;
- npm dependency audit;
- Official MCP Inspector CLI;
- public-package/source equivalence;
- exact client matrix.

## Release / Registry gate

Текущий порядок:

1. public npm `0.1.0` существует;
2. LP-098 должен реально выполнить внешний clean-install/source-equivalence/protocol smoke;
3. Inspector CLI должен реально выполниться, а не только существовать в workflow;
4. dependency audit должен реально выполниться;
5. результаты фиксируются как evidence;
6. только после этого возможна отдельная owner-команда на Official MCP Registry;
7. после Registry — внешний read-back;
8. затем exact client matrix и activation tests.

GitHub Actions run со `steps=null` не считается ни PASS, ни product failure. Это инфраструктурный блокер.

## Pareto rule

Не блокировать основной Page Optimizer вторичными каталогами, badges, paid listings, MCPB или сложным Remote/OAuth до доказанного локального `install → first successful workflow`.

Приоритет доверия:

`работает → безопасные границы → воспроизводимый пакет → понятная установка → первый результат → повторное использование → discovery`.
