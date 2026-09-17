# LayerPorter Page Optimizer — security gate amendment 2026-09-13

Этот файл не создаёт новый продуктовый шаг и не меняет нумерацию 30-шаговой дорожной карты. Он уточняет gates шагов 16–20 после свежего dependency/security review.

## LP-103 — decoder allowlist

Текущий `sharp@0.35.4` и `@img/sharp-libvips-*@1.3.3` используют bundled libheif 1.23.2.

Freshness review на 2026-09-13:
- libheif 1.23.3 закрыл critical advisory `GHSA-x8r2-mggj-j6wr` от 2026-09-01;
- libheif 1.23.4 от 2026-09-06 закрыл дополнительные security issues, включая high severity;
- `sharp 0.35.4` остаётся latest;
- `@img/sharp-libvips-linux-x64 1.3.3` остаётся latest публичным prebuilt для текущей линии.

Следствие: release target нельзя фиксировать как просто `libheif >=1.23.3`. Минимальный dependency baseline — **libheif >=1.23.4 + повторный review актуального advisory set фактически bundled runtime**.

До этого действует fail-closed input boundary:
1. block all `VipsForeignLoad` decoders;
2. unblock only JPEG / PNG / WebP Buffer loaders;
3. HEIF/AVIF, TIFF/GIF/SVG и другие input decoders остаются закрыты;
4. AVIF output encoder остаётся разрешённым;
5. новый input format требует отдельного security/product RETEST.

Draft implementation: PR #257 / LP-103.

## LP-104 — GitHub Actions infrastructure blocker

GitHub-hosted jobs в текущем incident создаются, но не получают runner и завершаются до первого workflow step (`steps=null`, logs отсутствуют). Это воспроизводится на независимых workflows и новых commit heads.

Единый infrastructure tracker: issue #258 / LP-104.

До восстановления hosted execution запрещено:
- классифицировать эти runs как product FAIL;
- ослаблять CI/security gates ради зелёного статуса;
- считать локальную проверку заменой exact pinned runtime test.

## Обновлённый критический release path

`npm 0.1.0 public → 15/15 public/source byte-equivalence PASS → LP-103 decoder allowlist candidate → exact pinned runtime execution → synced MCP + clean pack/install → public npm/Inspector/dependency gate → Official Registry STOP до отдельной owner authorization`.

## Gate Registry

Official MCP Registry остаётся STOP, пока одновременно не выполнены:
- LP-103 exact runtime/security checks;
- LP-098 external clean-install + Inspector + dependency audit;
- LP-104 больше не блокирует фактическое исполнение CI;
- trust metadata/claims соответствуют новой decoder boundary.

`0.1.0` immutable и не перепубликуется. Любой security-fixed npm release — только новая версия после отдельного release gate и отдельной owner authorization.
