# МИТ — LP-095 Artifact Delivery + Secure URL Ingestion

Дата: 2026-09-10
Issue: #219
База: `e1ba9d0fe4b40c3dbae946eab570ebd83531b8f2`
Ветка: `feat/LP-095-artifact-url-ingestion`
Recovery: `recovery/LP-094-pre-artifact-url-e1ba9d0`

## Зачем

Live-smoke на `layerporter.com` подтвердил, что image-core реально оптимизирует production images, но выявил две продуктовые дыры: MCP не умел сам безопасно забирать URL страницы и не отдавал готовый binary candidate пользователю вне model context.

## Решения

1. Binary output не возвращается внутри text tool result и не дублируется base64 в контексте модели.
2. ACCEPT candidate сохраняется только во временное изолированное хранилище ОС с TTL, byte/count budgets, SHA-256 и random ID.
3. Tool result возвращает MCP `resource_link`; bytes читаются отдельно через `resources/read` по `layerporter-artifact://artifact/{id}`.
4. URI никогда не преобразуется в пользовательский filesystem path: read разрешён только по in-memory artifact index.
5. URL ingestion вынесен в отдельный сетевой слой: только HTTP(S), URL credentials запрещены, private/link-local/reserved IP запрещены, socket DNS lookup валидируется, redirects валидируются повторно.
6. HTTP fast mode не утверждает `currentSrc`, rendered dimensions или LCP. Без браузерных фактов он не делает автоматический resize; `optimize_url_images` только recompress same dimensions.
7. Контракт MCP до первого публичного релиза расширяется с 5 до 7 tools: `analyze_url_images` и `optimize_url_images`. Оба `openWorldHint=true`, read-only/non-destructive.
8. Production write отсутствует. Публикация npm/Registry в LP-095 запрещена.

## Проверка

Три независимых метода:
1. MCP protocol: stdio Client -> tool -> `resource_link` -> `resources/read` -> real binary -> dimensions/bytes.
2. Security/adversarial: scheme, credentials, literal private IP, private DNS answer, mixed DNS, redirect-to-private, artifact path traversal.
3. Live + regression: `https://layerporter.com/` -> MCP URL tool -> optimization -> resource links -> resource reads + Image MCP CI + Session Gate.

## Gate

`URL -> OPTIMIZE -> ARTIFACT -> READ = PASS` только после успешных CI/live проверок. До этого статус: IMPLEMENTED / VERIFICATION PENDING.
