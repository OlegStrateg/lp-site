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
- skill-security-review — методика проверки внешних skills.
- review-skills: https://github.com/tomzx/agents/blob/main/skills/review-skills/SKILL.md — поиск дубликатов, пробелов, циклов и composability issues в skill library.

### Gate
Ни одна нетривиальная custom implementation не начинается без ответа «почему зрелые решения не подходят».

## 3. Этап 1 — Website Image Optimization MCP

### Компетенции
- Image Pipeline Engineer
- Web Performance / Core Web Vitals
- MCP Tool Designer

### Методики/скилы
1. Sharp/libvips docs + repo как технический источник истины.
2. Addy Osmani web performance guidance:
   https://github.com/addyosmani/agent-skills/blob/main/.claude/commands/webperf.md
   Использовать разделение Quick vs Deep: без измерений findings маркировать как potential impact; с Lighthouse/CrUX/trace — evidence-backed.
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
Статус: PRIMARY REFERENCE для Manifest V3, Chrome APIs, Side Panel, permissions и публикации.

### SEO skill
https://github.com/iannuttall/seo/blob/main/skills/seo/SKILL.md
Статус: EXTRACT METHOD.
Брать: evidence-first reports, progressive disclosure, source provenance, small follow-ups вместо giant context.
Не заменяет внутренний Field Intelligence Protocol.

### Accessibility skill
https://github.com/mgifford/accessibility-skills/blob/main/skills/axe-rules/SKILL.md
Статус: REFERENCE для axe rule mapping/severity.

### Web performance skill
https://github.com/addyosmani/agent-skills/blob/main/.claude/commands/webperf.md
Статус: PRIMARY METHOD для evidence discipline.

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
Взять из iannuttall/seo идею router skill: skill обучает агента выбирать нужный report/depth и не грузить всю систему сразу.

### Собственный skill, который потребуется создать
`page-optimizer-findings`
Задача:
- читать только normalized Finding schema;
- отделять observation/fact от inference;
- выбирать evidence по необходимости;
- формировать fix plan без права записи.

## 6. Этап 4 — Safe Fix Engine

### Компетенции
- Git / SDLC
- Secure Coding Agent Architecture
- DevSecOps

### Руководящие skill patterns
1. improve-codebase:
https://github.com/tomzx/agents/blob/main/skills/improve-codebase/SKILL.md
Ключевые правила: short-lived branch, low-risk auto only, mandatory verification, failed change reverts, bounded change budget.

2. Aider Git integration:
https://github.com/Aider-AI/aider/blob/main/aider/website/docs/git.md
Ключевые правила: isolate dirty changes, commit AI edits, diff/undo/history.

3. SafeAgent architecture:
https://github.com/parthamehta123/safeagent
Ключевые идеи: filesystem grounding, hashes, policy validation, sandbox, diff validation, tests, audit log, PR last.

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

### Скилы/методики
- Playwright screenshots/functional checks.
- autoreview:
  https://github.com/openclaw/agent-skills/blob/main/skills/autoreview/SKILL.md
  Принцип: source-aware review не является доказательством пользовательского поведения; нужен отдельный behavior validation.
- review-swarm:
  https://github.com/Dimillian/Skills/blob/main/review-swarm/SKILL.md
  Использовать как модель независимых read-only проверок: intent/regression, security/privacy, performance/reliability, contracts/coverage.

### Собственный skill
`verify-page-fix`
Три независимых слоя:
1. machine metrics;
2. visual regression;
3. functional smoke.
При fail → rollback, не «попытаться объяснить результат».

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
Это оркестратор, не монолитный эксперт. Он загружает skills по необходимости и не содержит всю SEO/performance/security теорию в одном prompt.

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

Связать с существующей LP-072, не строить второй quality-gate.

## 10. SEO / AI Search / Distribution skill

### Основной SEO router
https://github.com/iannuttall/seo/blob/main/skills/seo/SKILL.md

### Внутренний обязательный слой
Field Intelligence Protocol LayerPorter важнее любых внешних GEO skills.

### Собственный будущий skill
`ai-distribution-and-visibility`
Должен вести:
- registry submissions;
- entity/profile consistency;
- website/homepage/docs links;
- citation/mention baseline;
- repeated prompt tests по отдельным engines;
- UTM/referral attribution;
- 7/14/30/60 day evidence.

Нельзя обещать ranking/citation только из-за MCP, llms.txt, schema или каталога.

## 11. Минимальный набор скилов на MVP

Не устанавливать десятки skills.

P0 набор:
1. Chrome Extensions — GoogleChrome official.
2. SEO router methodology — iannuttall/seo.
3. Web performance — Addy Osmani.
4. axe rules reference.
5. Safe Git patch methodology — Aider + improve-codebase.
6. Skill security review.
7. Verification/review pattern — Playwright + review-swarm/autoreview.

Всё остальное — только если появляется конкретная задача.