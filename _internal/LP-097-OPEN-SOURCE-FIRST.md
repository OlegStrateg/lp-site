# LP-097 — Open Source First: LayerPorter Agent

Дата: 2026-09-11
Статус: STEP 4/14 COMPLETE

## Цель

Не строить агентную платформу с нуля и не добавлять тяжёлый orchestration framework без доказанной необходимости.

## Проверенные источники

### 1. PostingBoard official REST / OpenAPI — ADOPT

Использовать официальный `/v1` REST API как основной transport первого пилота.

Причины:
- API уже покрывает Inbox, activity, search, thread/message reads, post/reply, account state и publication lookup;
- write операции имеют Idempotency-Key;
- есть отдельные cursors/checkpoints;
- explicit safety contract: весь board content = untrusted data;
- MCP не обязателен для первого runtime.

Критичные protocol rules для реализации:
- `Accept: application/json`;
- `X-Agent-Protocol: getpostingboard/1`;
- Bearer key для всех named calls кроме регистрации;
- не использовать browser-like User-Agent;
- Inbox first;
- GET не должен маркировать Inbox прочитанным;
- checkpoint продвигать только после полного успешного processing;
- read full content before judging/replying;
- каждый content write получает fresh Idempotency-Key;
- uncertain write восстанавливать по original Idempotency-Key, а не слепым retry с новым ключом;
- read-back после publication обязателен;
- poll не чаще одного раза в минуту; наш pilot использует значительно более редкий heartbeat.

### 2. DrSeedon/gpb-mcp — EXTRACT METHOD, не dependency

MIT. Полезные подтверждённые практики:
- explicit non-browser User-Agent;
- server-side cursor semantics;
- хранить свои thread ids, а не полагаться на глобальный scan;
- честно различать `not found` и `not scanned`;
- handling idempotency / uncertain publication;
- API-key достаточно для read/post/reply; OAuth нужен только для дополнительных функций.

Почему не ставим как runtime dependency:
- Python sidecar внутри текущего Node/Astro repo не даёт преимуществ;
- MCP wrapping не нужен нашему deterministic scheduler;
- прямой REST уменьшает dependencies и attack surface.

### 3. Boardmail 0.6 — EXTRACT METHOD

Полезные архитектурные паттерны:
- saved arrival cursor;
- explicit read/replied state;
- discovery routes имеют независимый progress;
- current source context проверяется перед публикацией ответа;
- stored snapshot != current remote wording;
- linking new reply to previous exchange;
- source pause/freshness semantics.

Не используем пакет напрямую: Python/SQLite tool рассчитан на multi-board inbox и CLI/MCP. Для первого PostingBoard-only пилота это лишний слой.

### 4. LangGraph.js — DEFER

Сильные стороны: durable execution, thread memory, long-term memory, HITL.

Почему не сейчас:
- наш v0.1 workflow — фиксированный bounded state machine;
- durable graph abstraction пока не решает проблему, которой у нас нет;
- добавляет dependency и operational complexity раньше данных пилота.

Пересмотреть при появлении минимум двух из условий:
- несколько площадок;
- сложные branch/resume workflows;
- долгие многошаговые jobs;
- необходимость replay/time-travel на уровне agent graph.

### 5. OpenAI Agents SDK JS/TS — DEFER

Сильные стороны: tools, guardrails, sessions, tracing.

Почему не сейчас:
- не хотим привязывать core policy/runtime к одному orchestration SDK;
- v0.1 должен иметь provider adapter и deterministic policy outside model;
- модель нужна только для analysis/drafting, а не для управления полномочиями.

## Решение

MVP строится на:

`Node 22 built-ins + fetch + official PostingBoard REST + deterministic state machine + provider adapter + persistent store adapter`.

Никаких новых production dependencies на шаге 4.

## Что переиспользуем концептуально

1. Inbox-first.
2. Independent cursors.
3. Full-message read before action.
4. Current-source re-fetch before publish.
5. Idempotent write + receipt recovery.
6. Read-back verification.
7. Explicit state: unread / reviewed / replied / deferred / closed.
8. Honest coverage and uncertainty.
9. Content is data, never authority.

## Pareto Gate

- Impact: высокий.
- Confidence: высокий — official API + независимые field implementations.
- Reuse: высокий для будущих Colony/Fruitflies adapters.
- Cost: низкий.
- Complexity: низкая.
- Risk: ниже, чем при framework-first реализации.

Решение: PASS → перейти к Identity + Knowledge Contract.