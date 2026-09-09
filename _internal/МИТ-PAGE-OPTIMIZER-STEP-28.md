# МИТ — Page Optimizer — шаг 28/30

Дата: 2026-09-10
Issue: #212

Решение: Bounded Agent Mode строится как deterministic enforcement layer, а не как «умный prompt».

Зафиксировано:
- 1 finding на итерацию;
- максимум 3 итерации;
- действие выбирает только version-controlled allowlist;
- модель не может расширять action/rule/target;
- page content всегда untrusted;
- verification failure = немедленная остановка;
- production write и arbitrary tools запрещены;
- hosted AI/backend остаётся отдельным будущим слоем и не получает полномочий обходить policy.

Причина: минимизировать blast radius и исключить превращение prompt injection в tool execution.
