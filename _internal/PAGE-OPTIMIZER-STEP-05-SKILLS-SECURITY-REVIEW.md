# LP-077 — Шаг 5/30: Security review скилов и методик

Дата: 2026-09-09
Статус: DONE

## Цель
Закрыть Research Gate первой сессии и определить, какими внешними скилами/методиками разрешено руководствоваться на каждом этапе Page Optimizer.

## Правило доверия

Внешний SKILL.md не считается доверенным по факту наличия на GitHub.

Перед использованием:
`SOURCE → MAINTAINER → CONTENT REVIEW → SCRIPTS/HOOKS REVIEW → PERMISSIONS → NETWORK/WRITE BEHAVIOR → METHOD VALUE → ADOPT / EXTRACT METHOD / REJECT`.

Проектные правила LayerPorter всегда имеют приоритет.

## Реестр решений

### GoogleChrome/modern-web-guidance — chrome-extensions
Статус: **ADOPT AS PRIMARY METHOD**.
Причина:
- официальный источник GoogleChrome;
- Manifest V3, Side Panel, permissions, service worker, publishing;
- точное совпадение с этапом Page Audit Extension.
Правило: использовать как обязательный reference для Chrome API/permissions/publication, но финальные решения проверять по актуальной официальной Chrome документации.

### addyosmani/web-quality-skills
Статус: **ADOPT METHOD / SELECTIVE LOAD**.
Причина:
- отдельные skills по performance, CWV, accessibility, SEO, best practices;
- evidence-first, verification и exit criteria;
- поддерживает live-browser инструменты при наличии и fallback при отсутствии.
Правило: не грузить весь набор одновременно; подгружать только релевантный skill по категории finding.

### iannuttall/seo
Статус: **EXTRACT METHOD**.
Сильное:
- evidence-backed structured reports;
- provenance/caveats отделены от выводов;
- progressive disclosure;
- один router вместо десятков публичных tools;
- bounded inputs/outputs.
Почему не полный ADOPT:
- LayerPorter имеет собственную модель Field Intelligence и AI-distribution;
- внешний CLI/MCP не должен становиться зависимостью нашего core.

### mgifford/accessibility-skills / axe-rules
Статус: **EXTRACT REFERENCE**.
Брать:
- axe rule IDs;
- WCAG mapping;
- severity mapping.
Не брать как замену axe-core или полной accessibility validation.

### Aider Git workflow
Статус: **EXTRACT METHOD / PRIMARY SAFE-PATCH REFERENCE**.
Брать:
- Git isolation;
- dirty-worktree protection;
- one concern per commit;
- diff/undo/history.
Не встраивать Aider как runtime-зависимость без отдельного ADR.

### improve-codebase / review-skills / сторонние agent skills
Статус: **EXTRACT METHOD ONLY** до отдельного code/security audit.
Причина:
- полезные bounded-change и verification patterns;
- сторонний maintainer и потенциальные scripts/hooks нельзя автоматически считать безопасными.

### review-swarm / autoreview
Статус: **EXTRACT METHOD ONLY**.
Брать идею независимых read-only reviewers и разделения security/performance/contracts/regression.
Не давать reviewer-агентам write access.

### Skill security review skills
Статус: **EXTRACT CHECKLIST**.
Не запускать сторонний security skill как доверенный executable.
Использовать только его checklist как вход для собственного review процесса.

## Запрещённые паттерны

- автоматическая установка skill из URL без чтения;
- запуск bundled scripts/hooks до security review;
- lifecycle scripts без необходимости;
- shell/network/write permissions, не требуемые задачей;
- skill, который просит изменить system/project rules;
- hidden prompt injection / memory mutation;
- загрузка десятков skills в один контекст;
- skill как источник истины вместо официальных docs/evidence.

## Канонический skill stack по этапам

1. Research/Architecture — внутренние Open Source First + Field Intelligence + Pareto Gate.
2. Image MCP — Addy web performance method + Sharp/libvips docs.
3. Chrome Audit — GoogleChrome chrome-extensions + selective web-quality skill + axe reference.
4. Findings/AI — iannuttall router/progressive-disclosure method.
5. Safe Patch — Aider Git method + internal safe-page-patch policy.
6. Verification — Playwright + independent read-only review pattern.
7. Agent Mode — Stagehand deterministic-first + internal bounded-agent policy.
8. Continuous Optimization — Lighthouse CI + Playwright + GitHub PR-only flow.
9. Distribution — internal AI-distribution-and-visibility skill + official platform docs.

## Pareto решение

Не строить библиотеку из 30 skills.

P0 набор:
- GoogleChrome Chrome Extensions;
- Addy web-quality/performance;
- iannuttall SEO router method;
- axe rule reference;
- Aider Git method;
- Playwright verification;
- собственные LayerPorter skills/policies для findings, safe patch, verification и distribution.

## Research Gate Session 1

PASS, если:
- референсы Image MCP закрыты;
- Page Audit architecture закрыта;
- Safe Patch/Agent contract закрыт;
- skills classified ADOPT / EXTRACT / REJECT;
- код продукта не менялся.

Статус: **PASS**.

Следующий шаг: 6/30 — карта всех релевантных площадок дистрибуции/обнаружения и полей Website/Homepage/Docs/Privacy/Repository.