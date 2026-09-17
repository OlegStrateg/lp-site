# LP-102 — Activation / Growth Funnel для LayerPorter MCP

Дата: 2026-09-13  
Статус: `RESEARCH / PRODUCT FUNNEL ONLY / SECURITY HOLD`

## Цель

Строить не «публикацию MCP», а путь:

`проблема → доказательство → безопасное подключение → первый проверенный результат → второй результат → repeat → recommendation`.

MCP — канал доставки способности. Пользователь покупает результат: найденные проблемы, безопасные исправления, доказанное до/после, отсутствие регрессий.

## P0 security rule

До прохождения LP-103/LP-104/LP-105 запрещено превращать публичный `0.1.0` в acquisition/activation target.

`0.1.0`:
- допускается как forensic object в LP-098;
- не используется для новых Claude Code/Cursor/VS Code live installs;
- не получает install CTA;
- не продвигается через Registry/каталоги/paid distribution;
- не используется как база Remote.

Причина: bundled libheif 1.23.2 + отсутствие decoder allowlist LP-103.

Activation начинается только с **security-fixed exact version**, которая прошла:
1. LP-103 exact decoder/runtime tests;
2. synced MCP + pack/install/client/security gates;
3. отдельную owner authorization на publish;
4. public artifact external read-back/verification.

Рабочий target LP-105 — `0.1.1`, но до gates это только candidate, не install version.

## Три способа проверки funnel

1. **Качественный сценарий** — реальные задачи проходят от URL/страницы до понятного verified result без протокольного жаргона.
2. **Количественная воронка** — `audit start → meaningful finding → connect → first successful workflow → second session → 7d active`.
3. **Контроль каналов** — problem-intent landing, client install surface и generic MCP listing сравниваются по first-success/second-session, не clicks.

## Главный принцип

Ценность показывается до сложного подключения там, где это безопасно и capability реально существует.

Будущий массовый путь:

```text
problem search / AI answer / recommendation
                  ↓
             URL страницы
                  ↓
         bounded read-only audit
                  ↓
      evidence + quantified finding
                  ↓
     security-fixed connect/install
                  ↓
        first verified action
                  ↓
       before / after evidence
                  ↓
          second workflow
                  ↓
          share / referral
```

До Remote R0 первая ступень funnel остаётся research-only; не строить fake hosted audit form без runtime.

## 1. Первый результат

Плохой first value:
- MCP connected;
- 7 tools available;
- server healthy;
- Registry listed.

Хороший first value:
- avoidable bytes;
- число oversized images;
- конкретная hero-image проблема;
- безопасные candidates;
- доказуемая экономия.

Любая цифра должна происходить из фактического анализа. Browser-only facts не выводятся из static HTTP mode.

## 2. Входы в порядке приоритета

После security release gate:
1. problem-intent SEO / AI answers;
2. canonical LayerPorter product page;
3. фактический free audit после Remote R0;
4. VERIFIED client install surfaces;
5. Official MCP Registry после отдельного Registry gate;
6. secondary directories/community.

До security release gate эти каналы не ведут на install `0.1.0`.

## 3. Free audit

Создаётся только после реального Remote R0/output contract.

Минимум:
- одно поле URL;
- no registration;
- public page only;
- read-only;
- bounded limits;
- result state на той же странице;
- максимум 3 уровня результата: итог → top findings → safe next action.

Не строить hosted audit UI заранее.

## 4. CTA

### До security-fixed public release

Никакого install CTA.

Допустимо только:
- research/internal docs;
- security status;
- при необходимости нейтральная информация `release under security review`, но без ложного download/install path.

### После security-fixed public release + external verification

CTA может быть:

`Подключить LayerPorter и исправить безопасно`

Но показываются только VERIFIED client paths exact version.

### После Remote R0/R1

Audit → protected action, OAuth только когда пользователь реально хочет выполнить защищённое действие.

## 5. Client-aware install UX

Источник истины — LP-100 matrix.

Пока LP-100 rows `BLOCKED/PENDING`, production install UI не создаётся.

После verification:
- Claude Code — одна exact version command;
- Cursor — manual canonical config, deeplink после PASS;
- VS Code — exact `mcp.json`/supported install path;
- MCPB не primary до native/security matrix.

Не показывать «works everywhere» и не использовать floating version/latest в install snippets.

## 6. First successful workflow

После подключения дать 3–5 outcome prompts, например:
1. проверить страницу и показать только high-impact image problems;
2. найти безопасные candidates без resize assumptions;
3. оптимизировать безопасные candidates и показать before/after;
4. создать responsive variants без upscaling;
5. сравнить original/candidate и reject regression.

Security-fixed release добавляет mandatory negative path: неподдерживаемый HEIF/AVIF input должен fail-closed.

## 7. Before / After report

Компактный evidence:
- original bytes;
- output bytes;
- saving bytes/%;
- processed/accepted/rejected;
- rejection reasons;
- dimensions/format;
- verification status.

Hosted share URL — только после privacy/retention evidence и доказанного share behavior.

## 8. Growth loop

```text
Audit
  ↓
Useful finding
  ↓
Verified connect
  ↓
Verified fix
  ↓
Before/after
  ↓
Share/team/GitHub
  ↓
New audit / repeat
```

Share — следствие пользы, не spam loop.

## 9. SEO / AI discovery

Приоритет intent:
1. problem intent;
2. workflow/client intent;
3. MCP/protocol intent.

Примеры problem intent:
- website image optimization;
- oversized images website;
- improve LCP image;
- image performance audit.

Client-intent pages создаются только после exact VERIFIED client path. Не публиковать «for Claude Code/Cursor/VS Code» раньше собственного smoke.

## 10. Landing architecture

После фактических gates:
1. `/mcp/website-image-optimizer/` — product page;
2. problem-first audit URL — только после Remote R0;
3. 2–3 доказанных use-case pages;
4. docs/install отдельно от conversion landing.

Не плодить doorway pages.

## 11. Trust рядом с CTA

Только факты:
- read-only audit где применимо;
- no production write;
- bounded public URL fetch;
- decoder allowlist для security-fixed local/Remote core;
- verification before accepted optimization;
- security/privacy links;
- exact tested version/client claims.

Не писать `enterprise-grade security` и подобные недоказанные claims.

## 12. Метрики activation

События:
- `audit_started`;
- `audit_succeeded`;
- `meaningful_finding_shown`;
- `connect_cta_clicked`;
- `install_instructions_opened`;
- `client_connected` только если подтверждаем;
- `first_workflow_succeeded`;
- `second_workflow_succeeded`;
- `report_created`;
- `report_shared`;
- `return_7d`.

Коэффициенты:
1. audit success;
2. audit → meaningful finding;
3. finding → connect intent;
4. connect → first success;
5. first → second success;
6. 7d active;
7. cost per first success.

Security metrics добавляются как guardrails:
- unsupported decoder rejection success;
- private URL rejection success;
- failure/crash rate;
- security-related support events.

## 13. Не считать успехом

Vanity only:
- npm downloads;
- stars;
- directory rank;
- Registry impressions;
- landing views;
- raw connections;
- tools/list calls.

## 14. Эксперименты

Только после security-fixed activation path:

### EXP-01 value before connect
A: product page → verified install.  
B: product page → audit → result → verified install.  
Metric: first success / visitor.

### EXP-02 result framing
A: technical list.  
B: impact/bytes first.  
Metric: result → connect intent.

### EXP-03 client selection
A: all verified clients.  
B: recommended verified client + other options.  
Metric: install completion.

### EXP-04 prompt activation
A: generic docs.  
B: ready outcome prompts.  
Metric: first successful workflow.

При малом трафике — qualitative/sequential evidence, не псевдо-A/B.

## 15. Retention

Второй успех важнее подключения.

Причины вернуться:
- другая страница;
- re-audit после изменений;
- следующая партия images;
- comparison;
- новый before/after.

Reminders/notifications не строить до естественного repeat evidence.

## 16. Distribution priority

### P0 после security-fixed release
- canonical product page;
- verified install docs;
- problem-intent audit после Remote capability;
- npm security-fixed version;
- client surfaces после exact verification.

### Official Registry
Не P0 prerequisite и не acquisition proof. Publish только после отдельной owner authorization и security-fixed public verification.

### P1
- Smithery после VERIFIED Remote/MCPB-compatible artifact;
- Glama при подходящей модели;
- relevant awesome lists;
- result-driven community content.

### P2
- мелкие каталоги;
- paid placements;
- generic launch spam.

## 17. Paid placement rule

Никакой оплаты до:
- source attribution;
- connect/start signal;
- first-success attribution или сильного proxy;
- CAC ceiling.

Security-held release не рекламируется платно вообще.

## 18. Account/email/monetization

Не требовать email до first audit value.

Account только при фактической ценности: history, saved sites, protected quota, collaboration, billing, monitoring.

Тарифы после activation evidence; не продавать MCP call count как value unit.

## 19. Kill rules

STOP/redesign если:
- audit не даёт meaningful finding;
- connect требует ручного debaga;
- first success низкий;
- second-session почти нулевой;
- security negative tests нестабильны;
- client path требует unsafe workaround;
- channel даёт clicks без first success;
- free audit unit economics не сходится.

## 20. Gate перед production landing/CTA

Все пункты обязательны:
1. LP-103 exact security/runtime PASS.
2. LP-104 execution blocker снят либо есть эквивалентный exact execution evidence.
3. LP-105 security-fixed new version прошла pack/client/security gate.
4. Publish новой версии выполнен только после отдельной owner authorization.
5. Public artifact новой версии externally verified.
6. LP-100 минимум один exact client path `VERIFIED` для install CTA.
7. Для free audit — фактический Remote R0/output contract.
8. Privacy statement соответствует runtime.
9. Analytics minimal/privacy-safe.
10. Separate production deploy authorization + rollback point.

LP-098 forensic PASS старого `0.1.0` не заменяет ни один security gate выше.

## 21. Что делаем до снятия security/infra blockers

Разрешено:
- research funnel contract;
- security-fixed client matrix;
- Remote architecture;
- measurement schema;
- problem-intent research.

Запрещено:
- production install CTA;
- `0.1.0` client promotion;
- hosted audit UI без runtime;
- Registry publish;
- paid distribution;
- broad compatibility claims.

## Решение LP-102

Главная ранняя метрика:

**доля пользователей, которые после доказанной проблемы через security-fixed path доходят до первого проверенного результата и возвращаются за вторым workflow.**

Discovery, npm, Registry, SEO и PR оцениваются относительно этой метрики, а не сами по себе.
