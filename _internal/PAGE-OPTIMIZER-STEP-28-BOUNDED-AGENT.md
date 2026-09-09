# LP-089 — Шаг 28/30: Bounded Agent Mode

Дата: 2026-09-10
Статус: DONE / PASS
Issue: #212
CI: GitHub Actions run 34410747979 — SUCCESS

## Оптимизационный аудит

Проверены актуальные практики agent runtime и безопасности. Вывод: ограничение нельзя хранить только в prompt. Action allowlist должен исполняться кодом вне модели; автономность должна иметь hard iteration cap; containment/least privilege важнее постоянных approval prompts.

## Контракт

`GOAL → SELECT ONE ALLOWED FINDING → COMPILE DETERMINISTIC ACTION → EXECUTE SAFE CONTOUR → VERIFY → CONTINUE OR STOP`

Hard limits:
- максимум 1 finding/итерацию;
- максимум 3 итерации/цель;
- только high-confidence findings;
- allowlist: `oversized_image → OPTIMIZE_OVERSIZED_IMAGE`, `missing_image_dimensions → PREVIEW_IMAGE_DIMENSIONS`;
- модель/предложение не может выбрать другой action, target или rule;
- page text не авторизует инструменты;
- failed verification немедленно останавливает цикл;
- finding не повторяется в одной сессии;
- production write = false;
- arbitrary tools = false.

## Почему не подключён hosted AI

Шаг 28 строит enforcement boundary, а не провайдера модели. API key/network в расширение не добавляются. Когда backend inference появится, он сможет только предложить структурированный вариант внутри уже существующей политики; право на действие остаётся у deterministic policy layer.

## Проверки

1. Unit/adversarial: unsupported rule, action substitution, target substitution, prompt-injection text блокируются — PASS.
2. Loop simulation: максимум 3 verified iterations, stop immediately on regression — PASS.
3. CI regression: permissions/network/write/unsafe HTML остаются запрещены — PASS.

## Gate

PASS. Action surface не расширен за пределы двух ранее разрешённых safe fixes; автономный цикл ограничен детерминированным policy layer.
