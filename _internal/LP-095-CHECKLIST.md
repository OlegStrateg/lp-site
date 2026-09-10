# LP-095 — CHECKLIST

## Перед реализацией

- [x] Проверен актуальный MCP v2: `resource_link` + binary `resources/read`.
- [x] Проверены SSRF-рекомендации OWASP.
- [x] Зафиксированы 3 независимых способа проверки.
- [x] Созданы recovery и отдельная feature branch.
- [x] Issue #219 создан.
- [x] Pareto Gate: HTTP fast mode не делает auto-resize без browser facts.

## Artifact Delivery

- [x] Binary отсутствует в tool text.
- [x] ACCEPT output получает временный artifact.
- [x] Artifact имеет random ID, MIME, size, SHA-256, TTL.
- [x] Есть max file/count/total byte budgets.
- [x] Файл создаётся с mode 0600 внутри OS temp root.
- [x] Arbitrary path traversal невозможен.
- [x] MCP возвращает `resource_link`.
- [x] MCP `resources/read` отдаёт binary blob отдельно.

## Secure URL Ingestion

- [x] Только HTTP(S).
- [x] URL credentials запрещены.
- [x] localhost/private/link-local/reserved IP запрещены.
- [x] DNS проверяется в socket lookup.
- [x] Mixed public/private DNS блокируется.
- [x] Redirect валидируется на каждом hop.
- [x] Page/image byte limits.
- [x] Timeout + redirect limit + bounded concurrency.
- [x] HTML и image Content-Type проверяются.
- [x] Image bytes проходят реальный Sharp decode/metadata validation.
- [x] HTTP mode не заявляет browser rendered/LCP facts.
- [x] HTTP mode не делает auto-resize.

## Gate

- [ ] Unit/security tests PASS.
- [ ] MCP stdio -> tool -> resource_link -> resources/read PASS.
- [ ] Live `layerporter.com` URL -> artifact PASS.
- [ ] Image MCP Verify PASS.
- [ ] Session Gate PASS.
- [ ] Финальный HEAD и run IDs записаны в МИТ.
- [ ] Issue #219 закрыт только после полного PASS.
- [x] npm/Registry publication НЕ выполняется в LP-095.
