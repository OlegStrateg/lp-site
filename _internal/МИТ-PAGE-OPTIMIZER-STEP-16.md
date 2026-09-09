# МИТ — PAGE OPTIMIZER — Шаг 16/30

Дата: 2026-09-09
Статус: DONE

## Зафиксированные решения

1. Публичная упаковка Website Image Optimizer MCP строится вокруг двух канонических индексируемых поверхностей:
   - `/mcp/website-image-optimizer/`;
   - `/docs/mcp/website-image-optimizer/`.
2. Используется существующий Astro `PageLayout`; отдельная дизайн-система ради MCP не создаётся.
3. До фактической публикации наружный статус продукта — `technical candidate`, не `released`.
4. Запрещено заранее заявлять npm, Official MCP Registry, hosted endpoint, SLA, retention или рыночные проценты savings как уже существующие.
5. Engineering benchmark публикуется только с явным указанием, что fixture синтетический и цифры не являются универсальным обещанием.
6. Product identity фиксируется единообразно:
   - LayerPorter;
   - Website Image Optimizer MCP;
   - LayerPorter Website Image Optimizer MCP.
7. MCP tool annotations добавлены как risk metadata:
   - readOnly=true;
   - destructive=false;
   - idempotent=true;
   - openWorld=false.
8. Annotations не считаются security enforcement. Hard security = отсутствие network/production/filesystem side effects, bounded inputs, deterministic image policy и regression tests.
9. После annotations MCP regression gate повторно прошёл: Run `34342062366` — success.
10. Публичные Astro-страницы проверяются отдельным узким workflow, а не общим root build: Run `34342156191` — success.
11. Общий root `npm run build` в текущем репозитории имеет отдельный существующий дефект smoke-пути: Node 22 напрямую импортирует `.ts` (`src/lib/converter/buildPsd.ts`) и падает с `ERR_UNKNOWN_FILE_EXTENSION`. В рамках LP-078 этот долг не исправляется и не маскируется.
12. Public Packaging Gate = PASS; Public Release = NOT YET.

## Следующий переход

Шаг 17 должен подготовить и проверить реальный distributable artifact / package metadata / registry package, чтобы installation проверялся уже из фактического канала распространения.
