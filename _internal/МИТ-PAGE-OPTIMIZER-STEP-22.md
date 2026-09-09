# МИТ — Page Optimizer — шаг 22/30

Дата: 2026-09-09
Issue: #200 / LP-083

## Решение

В Page Audit Extension вводится отдельный нормализующий слой между сырыми правилами и Side Panel.

Зафиксировано:
- повторяющиеся element findings агрегируются по ruleId;
- affectedCount сохраняется полностью, evidence ограничивается 5 примерами;
- severity, confidence, category и fixability являются отдельными полями;
- priority score детерминированный и прозрачный;
- масштаб даёт ограниченный бонус и не должен ломать severity hierarchy;
- likelyHero никогда не считается observed LCP, confidence для hero heuristic = medium;
- общий health score сайта не вводится;
- fixability не смешивается с impact score;
- Side Panel показывает work items, а не список каждого экземпляра проблемы.

Формула:
`round(severityBase × confidenceMultiplier + scaleBonus)`.

Следующий шаг после PASS: 23/30 AI Fix Suggestions без автоматического применения изменений.
