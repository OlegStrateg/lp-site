# LP-066 — Home funnel analytics

## Scope
Восстановить измерение Home → Extensions / Pinterest Downloader / Picture Converter / Web Tools без изменения Home-разметки, SEO-текстов и дизайна.

## Проверки до реализации
1. `functions/api/collect.js`: `path_card_click` уже разрешён серверным allowlist.
2. `src/lib/analytics.ts`: `href` запрещён к отправке и удаляется sanitizer, поэтому URL используется только локально для классификации.
3. Home EN + 7 locale: существующие inline listeners считают EN Extensions, Pinterest Downloader и `/convert/`, но пропускают localized `/{locale}/extensions/` и Picture Converter.

## Решение
- централизованная классификация существующих `path_card_click` в shared analytics adapter;
- стабильные target: `home_extensions`, `home_pinterest_downloader`, `home_picture_converter`, `home_web_tools`;
- дополнительный listener покрывает только два исторических пробела, чтобы не создавать дублей;
- `href` по-прежнему не передаётся на сервер;
- build-gate проверяет все 8 Home и четыре target.

## Recovery
`backup/pre-LP-066-home-funnel-analytics` → `1a8cfcb4cb2e5ac0a93be3cba28ef01625f1bd3e`.
