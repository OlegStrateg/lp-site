# LP-094 — чек-лист проприетарной лицензии

Дата: 2026-09-10
Issue: #218

## Три независимых метода проверки

1. Metadata/preflight: `package.json` и LICENSE должны совпадать с выбранной proprietary-моделью.
2. Artifact verification: `npm pack` должен реально содержать LICENSE и корректное license metadata.
3. Runtime/regression: clean install, stdio smoke, image-core/MCP tests и полный session/Astro gate должны остаться зелёными.

## Лицензия

- [x] Решение владельца: свободное копирование не разрешать.
- [x] Разрешить только технически необходимые копии для установки/запуска официального неизменённого пакета.
- [x] Запретить модификацию и производные работы.
- [x] Запретить перепаковку, зеркалирование и распространение.
- [x] Запретить сублицензирование, продажу, аренду и передачу.
- [x] Сохранить права третьих сторон на их зависимости.
- [x] Не придумывать юрисдикцию/применимое право без отдельного решения владельца.

## Package / CI

- [x] `license = SEE LICENSE IN LICENSE`.
- [x] package-local `LICENSE` добавлен.
- [x] `LICENSE` явно указан в files.
- [x] release preflight проверяет proprietary metadata и LICENSE.
- [x] publishable preflight включён в release CI.
- [x] packed artifact проверяет LICENSE после `npm pack`.
- [x] LP-094 branch включён в Image MCP и Session Gate workflows.
- [x] Image MCP CI SUCCESS: run `34414938599`.
- [x] Session Gate SUCCESS: run `34414938551`.
- [x] npm pack / packed license / clean install / stdio smoke / Registry validate PASS.
- [x] Astro public pages build PASS.

## Release truth

- [x] npm publish в LP-094 не выполняется.
- [x] MCP Registry publish в LP-094 не выполняется.
- [x] Публичная доступность пакета не заявляется до фактической публикации.

Финальный статус: **PROPRIETARY LICENSE READY / PASS / NO PUBLICATION**.
