# LayerPorter Page Optimizer — реестр скилов и методик

Статус: LP-077 / 2026-09-09

## 1. Правило использования внешних скилов

Сторонний SKILL.md не считается доверенным только потому, что он популярен или опубликован на GitHub.

Перед использованием:
1. прочитать SKILL.md полностью;
2. проверить scripts/hooks/package lifecycle и bundled files;
3. проверить repo activity/license/issues;
4. проверить на prompt/tool/memory poisoning и опасные permissions;
5. брать методику частично, если полный skill избыточен;
6. проектные правила LayerPorter всегда выше внешнего skill.

Security-review референсы:
- https://github.com/garymike/skills/blob/main/skills/skill-security-review/SKILL.md
- https://github.com/superagent-ai/skills/blob/main/skills/skill-security/SKILL.md

## 2. Этап 0 — исследование и архитектура

### Основные компетенции
- Technical Architect
- Open Source Research
- Product/Pareto
- Security Review

### Руководящие методики
- LayerPorter Open Source First / Field Intelligence / Pareto Gate — канонические внутренние правила.
- skill-security-review — использовать только как checklist, не как доверенный executable.
- review-skills — извлекать метод проверки дубликатов, пробелов, циклов и composability issues.

### Gate
Ни одна нетривиальная custom implementation не начинается без ответа «почему зрелые решения не подходят».

## 3. Этап 1 — Website Image Optimization MCP

### Компетенции
- Image Pipeline Engineer
- Web Performance / Core Web Vitals
- MCP Tool Designer

### Методики/скилы
1. Sharp/libvips docs + repo как технический источник истины.
2. Addy Osmani web-quality/performance guidance — ADOPT METHOD, SELECTIVE LOAD.
3. MCP design principle: минимальное число tools, понятные schemas, URL/page-context first.

### Обязательные проверки
- byte savings;
- visual quality;
- alpha/orientation/colors;
- no-upscale;
- responsive markup correctness;
- page-level before/after.

## 4. Этап 2 — Chrome Page Audit Extension

### Компетенции
- Chrome Extension MV3 Engineer
- Performance Engineer
- Technical SEO
- Accessibility

### Главный Chrome skill
GoogleChrome official modern-web-guidance:
https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/chrome-extensions/SKILL.md
Статус: **ADOPT AS PRIMARY METHOD**.
Использовать для Manifest V3, Chrome APIs, Side Panel, permissions и публикации. Финальные API/permission решения сверять с актуальной официальной документацией Chrome.

### SEO skill
https://github.com/iannuttall/seo/blob/main/skills/seo/SKILL.md
Статус: **EXTRACT METHOD**.
Брать: evidence-first reports, progressive disclosure, source provenance, bounded inputs/outputs, один router вместо десятков публичных tools.
Не делать внешний SEO CLI/MCP зависимостью ядра LayerPorter.

### Accessibility skill
https://github.com/mgifford/accessibility-skills/blob/main/skills/axe-rules/SKILL.md
Статус: **EXTRACT REFERENCE**.
Брать rule IDs / WCAG mapping / severity; не заменяет axe-core и manual validation.

### Web performance skills
https://github.com/addyosmani/web-quality-skills
Статус: **ADOPT METHOD / SELECTIVE LOAD**.
Подгружать только нужный category skill, не весь набор.

## 5. Этап 3 — AI Fix Suggestions

### Компетенции
- LLM Systems Architect
- Technical SEO / Performance expert by category
- Context/Token Efficiency

### Методика
Не использовать «LLM reads everything».
Pipeline:
`RAW → NORMALIZE → DEDUPE → RULES → PRIORITY → TARGETED EVIDENCE → LLM`.

### Router-skill pattern
Из iannuttall/seo: один router выбирает нужный report/depth; большие issue inventories и raw provider rows только opt-in.

### Собственный skill
`page-optimizer-findings`
- читает normalized Finding schema;
- отделяет observation/fact от inference;
- выбирает evidence по необходимости;
- формирует fix plan без права записи.

## 6. Этап 4 — Safe Fix Engine

### Компетенции
- Git / SDLC
- Secure Coding Agent Architecture
- DevSecOps

### Руководящие patterns
1. Aider Git integration — **EXTRACT METHOD / PRIMARY SAFE-PATCH REFERENCE**.
   Брать: isolate dirty changes, short-lived branch, commits, diff, undo/history.
   Не встраивать Aider runtime без отдельного ADR.
2. improve-codebase — **EXTRACT METHOD ONLY** до отдельного code/security audit.
3. SafeAgent-like architecture — **EXTRACT CONCEPTS**: grounding, hashes, policy validation, sandbox, diff validation, tests, audit log, PR last.

### Собственный skill
`safe-page-patch`
Разрешает write только если finding.auto_fixability=SAFE и target входит в allowlist.
Запрещает production direct write, business JS, checkout, auth, analytics, forms/backend, mass refactor.

## 7. Этап 5 — Verification Engine

### Компетенции
- QA Automation
- Visual Regression
- Performance Validation
- SEO Regression

### Методики
- Playwright screenshots/functional checks — PRIMARY VERIFICATION.
- autoreview / review-swarm — **EXTRACT METHOD ONLY**: независимые read-only проверки intent/regression, security/privacy, performance/reliability, contracts/coverage.
- reviewer agents никогда не получают write access.

### Собственный skill
`verify-page-fix`
Три независимых слоя:
1. machine metrics;
2. visual regression;
3. functional smoke.
При fail → rollback.

## 8. Этап 6 — Agent Mode

### Компетенции
- Agent Architect
- Policy/Safety
- Browser Automation

### Методика
Stagehand principle: deterministic action when known; AI only for uncertainty.
Agent loop bounded:
`GOAL → AUDIT → SELECT SAFE → PLAN → PATCH → VERIFY → DECIDE`.
Максимум ограниченное число итераций; no infinite self-healing loop.

### Собственный skill
`page-optimizer-agent`
Оркестратор, не монолитный эксперт. Загружает category skills по необходимости и не содержит всю SEO/performance/security теорию в одном prompt.

## 9. Этап 7 — Continuous Optimization

### Компетенции
- CI/CD / SRE
- Performance Budgets
- Regression Engineering

### Методики
- Lighthouse CI regression/budgets;
- Playwright smoke/visual;
- GitHub PR-only fixes;
- report-only → baseline → regression gate → target budgets.

Связать с LP-072, не строить второй quality-gate.

## 10. SEO / AI Search / Distribution

### Основной SEO router method
https://github.com/iannuttall/seo/blob/main/skills/seo/SKILL.md

### Внутренний обязательный слой
Field Intelligence Protocol LayerPorter важнее любых внешних GEO skills.

### Собственный будущий skill
`ai-distribution-and-visibility`
- registry submissions;
- entity/profile consistency;
- website/homepage/docs links;
- citation/mention baseline;
- repeated prompt tests по отдельным engines;
- UTM/referral attribution;
- 7/14/30/60 day evidence.

Нельзя обещать ranking/citation только из-за MCP, llms.txt, schema или каталога.

## 11. Security classification — шаг 5/30

### ADOPT AS PRIMARY METHOD
- GoogleChrome chrome-extensions.
- Addy Osmani web-quality/performance — selective category load.

### EXTRACT METHOD / REFERENCE
- iannuttall/seo router/progressive disclosure.
- mgifford axe rules reference.
- Aider Git workflow.
- improve-codebase/review-skills.
- review-swarm/autoreview.
- skill-security-review checklists.

### REJECT AS AUTOMATIC EXECUTABLE
- любой сторонний skill до чтения bundled scripts/hooks;
- skill с лишними shell/network/write permissions;
- skill, меняющий system/project rules или memory;
- lifecycle scripts без доказанной необходимости;
- bulk skill installation ради «больше компетенций».

## 12. Минимальный P0 skill stack

Не устанавливать десятки skills.

1. GoogleChrome Chrome Extensions.
2. Addy web-quality/performance.
3. iannuttall SEO router methodology.
4. axe rule reference.
5. Aider Git methodology.
6. Playwright verification.
7. Собственные LayerPorter policies/skills: findings, safe patch, verification, distribution.

Полный security-review шага 5: `_internal/PAGE-OPTIMIZER-STEP-05-SKILLS-SECURITY-REVIEW.md`.
