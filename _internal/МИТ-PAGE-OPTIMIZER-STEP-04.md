# МИТ — LAYERPORTER PAGE OPTIMIZER — ШАГ 4/30

Дата: 2026-09-09
Статус: DONE
Issue: #182
Branch: `research/LP-077-page-optimizer-base`

## Что сделано
Проведён углублённый аудит Safe Patch + Verification + Agent Loop.

Проверены и классифицированы:
- Aider — Git isolation / diff / dirty state separation / undo / dry-run;
- Playwright — visual regression / functional verification / trace;
- Stagehand — `observe → validate → act`, deterministic-first;
- Browser Use — allowed domains, prohibited domains, scoped secrets, max steps, restricted tools.

## Решение
Канонический контур:
`BASELINE → SNAPSHOT → SCOPE → PLAN → VALIDATE TARGETS → PATCH → STATIC CHECKS → PREVIEW → FUNCTIONAL TEST → VISUAL TEST → RECHECK → COMPARE → ACCEPT/ROLLBACK`.

Агент не получает прямой доступ к production/default branch и не может расширять собственные права.

## Уровни автономности
SAFE AUTO: изображения, resize, форматы, responsive variants, srcset/sizes, width/height, строго ограниченные loading/fetchpriority/preload fixes.

REVIEW REQUIRED: title/meta, неоднозначный alt, canonical/schema, структурные HTML/CSS и видимые тексты.

FORBIDDEN AUTONOMOUS: business JS, checkout, платежи, auth, analytics, backend, database, реальные формы, pricing/positioning, удаление блоков, secrets/CI permissions, массовый refactor.

## Bounded loop
- один Finding за итерацию;
- максимум 3 итерации;
- allowlisted tools/files/domains;
- target/hash validation перед patch;
- обязательная независимая verification;
- FAIL = rollback + failure fixture;
- только внешний gate может дать VERIFIED.

## Проверки
1. Deterministic/machine.
2. Functional + visual через Playwright.
3. Git reversibility / rollback.

## Git
Исследовательский файл: `_internal/PAGE-OPTIMIZER-STEP-04-SAFE-PATCH-AGENT.md`.
Commit research: `f279332342576c83ab8b229f6d49ba0728ca274f`.

## Следующий шаг
5/30 — security review реестра скилов и методик: `ADOPT / EXTRACT METHOD / REJECT` по каждому этапу.