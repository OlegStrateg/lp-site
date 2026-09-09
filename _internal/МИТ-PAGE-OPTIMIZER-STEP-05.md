# МИТ — PAGE OPTIMIZER — ШАГ 5/30

Дата: 2026-09-09
Статус: DONE
Ветка: `research/LP-077-page-optimizer-base`
Issue: #182 / LP-077

## Что сделано

Проведён security review и классификация внешних скилов/методик для всех этапов Page Optimizer.

Классы:
- ADOPT AS PRIMARY METHOD;
- EXTRACT METHOD / REFERENCE;
- REJECT AS AUTOMATIC EXECUTABLE.

## Решения

### ADOPT AS PRIMARY METHOD
- GoogleChrome `chrome-extensions` — официальный Manifest V3 / Side Panel / permissions / publication reference.
- Addy Osmani `web-quality-skills` — selective category method для performance/CWV/accessibility/SEO; не грузить весь набор одновременно.

### EXTRACT METHOD / REFERENCE
- iannuttall/seo — evidence-first router, provenance, progressive disclosure, bounded context.
- mgifford axe-rules — mapping/severity reference.
- Aider — Git isolation/diff/undo/history.
- improve-codebase/review-skills — bounded-change patterns.
- review-swarm/autoreview — независимые read-only reviewers.
- skill-security-review — checklist only.

### REJECT AS AUTOMATIC EXECUTABLE
- любой сторонний skill до полного чтения bundled scripts/hooks;
- skill с лишними shell/network/write permissions;
- skill, пытающийся менять project/system rules или memory;
- package lifecycle scripts без необходимости;
- массовая установка skills ради количества.

## Pareto stack MVP

1. GoogleChrome Chrome Extensions.
2. Addy web-quality/performance.
3. iannuttall SEO router methodology.
4. axe rules reference.
5. Aider Git methodology.
6. Playwright verification.
7. Собственные LayerPorter policies/skills для findings, safe patch, verification, distribution.

## Research Gate Session 1

PASS.

Закрыты шаги:
1/30 tracker,
2/30 Image MCP references,
3/30 Page Audit references,
4/30 Safe Patch/Verification/Agent contract,
5/30 skills security review.

Код продукта не менялся.

## Следующий шаг

6/30 — карта всех релевантных площадок дистрибуции/обнаружения с проверкой реальных submission paths, полей Website/Homepage/Docs/Privacy/Repository, индексации, discoverability, referral/citation и spam risk.