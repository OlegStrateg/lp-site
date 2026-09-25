# LayerPorter MCP — матрица клиентской совместимости

Дата исследования: 2026-09-13  
Статус: `SECURITY HOLD / PENDING LIVE SMOKE` — документ не является заявлением о совместимости.

## P0 security rule

Публичную `@layerporter/image-optimizer-mcp@0.1.0` **не использовать для новых live client tests** после выявления LP-103/LP-105 security hold.

Причина: `0.1.0` содержит `sharp@0.35.4` / `@img/sharp-libvips-*@1.3.3` с bundled libheif 1.23.2 и не содержит decoder allowlist LP-103. Проверка 15/15 файлов доказывает подлинность опубликованного артефакта, а не безопасность работы с недоверенным image input.

Все новые client smokes проводятся только на версии, которая одновременно:
1. содержит LP-103 fail-closed decoder allowlist;
2. прошла exact pinned runtime + packed MCP security gates;
3. имеет отдельный approved version identity;
4. опубликована и externally verified, если тест требует public npm install.

До этого в командах ниже используется placeholder:

`<SECURITY_FIXED_VERSION>`

Рабочая версия-кандидат в LP-105 — `0.1.1`, но placeholder нельзя заменять на `0.1.1`, пока release candidate не прошёл gates.

## Принцип совместимости

LayerPorter не использует claim «совместимо с клиентом», пока не пройден живой тест конкретной связки:

`точная версия клиента + ОС + Node/npm + точная security-fixed версия LayerPorter + реальный MCP workflow`.

Registry listing, MCP initialize через Inspector или наличие stdio support у клиента сами по себе совместимость LayerPorter не доказывают.

## Gate совместимости

Для каждого клиента нужны минимум три независимых слоя:

1. **Установка / запуск** — exact approved package реально запускается клиентом.
2. **Протокол / discovery** — клиент видит ожидаемые 7 tools и корректно работает с MCP resources.
3. **Пользовательский workflow** — естественный запрос выбирает правильный tool, результат корректен, restart/reconnect и вторая сессия проходят.

Дополнительные security smokes:
- localhost/private URL должен быть отклонён;
- HEIF/AVIF input на security-fixed candidate должен fail-closed по decoder allowlist;
- обычный JPEG/PNG/WebP сценарий должен продолжать работать.

## Текущая матрица

| Клиент | Install path candidate | Приоритет | Статус | Gate |
| --- | --- | --- | --- | --- |
| Claude Code | local stdio через `npx` exact security-fixed version | P0 | BLOCKED BY LP-103/104/105 | install + 7 tools + workflow + security negatives + second session |
| Cursor | manual `mcp.json`, затем deeplink | P0 | BLOCKED BY LP-103/104/105 | manual first + tool call + restart + security negatives |
| VS Code | `.vscode/mcp.json` / user config / `code --add-mcp` | P0/P1 | BLOCKED BY LP-103/104/105 | trust prompt + tool call + restart + security negatives |
| Claude Desktop | MCPB/Desktop Extension | HOLD | NOT TESTED | native Sharp cross-platform matrix first |
| ChatGPT | current local stdio не является install path | FUTURE REMOTE | NOT APPLICABLE | Remote MCP/App contour |
| OpenAI API Remote MCP | remote URL required | FUTURE REMOTE | NOT APPLICABLE | Remote endpoint + auth/data-flow smoke |
| Другие клиенты | secondary | P2 | NOT TESTED | только после P0 activation evidence |

## 1. Claude Code — P0

Официальный механизм local stdio остаётся кандидатом. Команда после security release gate:

```bash
claude mcp add --transport stdio layerporterImageOptimizer -- npx -y @layerporter/image-optimizer-mcp@<SECURITY_FIXED_VERSION>
```

Проверка конфигурации:

```bash
claude mcp get layerporterImageOptimizer
claude mcp list
```

В Claude Code:

```text
/mcp
```

### Live smoke

Фиксировать:
- exact Claude Code version;
- ОС/version;
- Node/npm;
- exact LayerPorter package version;
- install scope;
- startup latency;
- tool count;
- first workflow latency;
- restart/reconnect;
- ошибки.

Discovery:

```text
Открой список инструментов LayerPorter и подтверди, что доступно 7 MCP tools.
```

Естественный выбор tool:

```text
Проверь изображения на https://layerporter.com/ и покажи только самые важные проблемы. Ничего на сайте не изменяй.
```

Ожидание: `analyze_url_images`, без выдуманных browser LCP/currentSrc facts.

Network security negative:

```text
Проверь изображения на http://127.0.0.1/ . Ничего не изменяй.
```

Ожидание: controlled rejection private/loopback boundary.

Decoder security negative выполняется отдельным fixture/tool-call тестом: HEIF/AVIF input не должен достигать decoder; JPEG/PNG/WebP остаются рабочими.

Затем новая сессия и повтор обычного audit. Только после второй успешной сессии exact combination получает `VERIFIED`.

## 2. Cursor — P0

Первый тест — только прозрачная manual config; deeplink после PASS.

`.cursor/mcp.json` или `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "layerporterImageOptimizer": {
      "command": "npx",
      "args": ["-y", "@layerporter/image-optimizer-mcp@<SECURITY_FIXED_VERSION>"]
    }
  }
}
```

Deeplink строится из того же canonical config:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=$NAME&config=$BASE64_ENCODED_CONFIG
```

Smoke: 7 tools → normal URL audit → localhost rejection → decoder negative fixture → restart → second audit.

Фиксировать project/global scope, connected state, tool count, необходимость restart и deeplink install completion.

## 3. VS Code — P0/P1

VS Code использует top-level `servers`.

`.vscode/mcp.json`:

```json
{
  "servers": {
    "layerporterImageOptimizer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@layerporter/image-optimizer-mcp@<SECURITY_FIXED_VERSION>"]
    }
  }
}
```

CLI candidate:

```bash
code --add-mcp "{\"name\":\"layerporterImageOptimizer\",\"command\":\"npx\",\"args\":[\"-y\",\"@layerporter/image-optimizer-mcp@<SECURITY_FIXED_VERSION>\"]}"
```

Trust confirmation локального MCP является частью smoke и не обходится.

На macOS/Linux VS Code поддерживает sandbox для local stdio; Windows limitation фиксируется отдельно и не скрывается.

Smoke: trust → 7 tools → normal audit → localhost rejection → decoder negative fixture → restart → second audit.

## 4. Claude Desktop / MCPB — HOLD

MCPB остаётся вне critical path из-за native `sharp`/libvips packaging risk.

До claim обязательны:
- isolated bundle candidate;
- Windows + macOS exact Claude Desktop versions;
- native binary loading;
- start + 7 tools + resource read;
- decoder allowlist security negatives;
- restart/update/uninstall.

Если нужен undocumented/native workaround — `REJECT MCPB` для текущей архитектуры; local npm/Claude Code и будущий Remote остаются предпочтительнее.

## 5. ChatGPT / OpenAI — отдельный Remote contour

Текущий package — local `stdio`. Поэтому:
- `0.1.0` и будущий local stdio package нельзя рекламировать как «Install in ChatGPT»;
- ChatGPT не входит в local client matrix;
- OpenAI API Remote MCP проверяется только после фактического Remote endpoint;
- hosted path требует отдельного privacy/security disclosure.

## Универсальная запись evidence

```text
client_name
client_version
os
os_version
node_version
npm_version
layerporter_package_version
release_security_gate
install_method
install_scope
server_started
expected_tool_count = 7
tool_count_actual
natural_tool_selection
normal_url_audit
private_url_rejected
heif_avif_input_rejected
jpeg_png_webp_regression
resource_support_if_exercised
restart_reconnect
second_session_success
p50_first_result_if_measured
failure_notes
evidence_link
decision = VERIFIED | RETEST | HOLD | REJECT
```

## Правила публичных claims

Разрешённый формат только после exact live smoke:

```text
Tested with Cursor <version> on Windows 11 using LayerPorter <version>
```

Запрещено без доказательств:

```text
Works everywhere
Works with all MCP clients
Claude/Cursor/VS Code compatible
One-click Claude Desktop install
ChatGPT compatible
```

Update клиента/runtime/permissions/resources, влияющий на запуск, переводит строку в `RETEST`.

## Порядок фактической проверки после security release gate

1. LP-103 exact decoder/security gate.
2. LP-104: hosted execution восстановлен либо получен эквивалентный exact execution evidence.
3. LP-105: security-fixed package candidate полностью проходит pack/client/security gates.
4. После authorized publish и external read-back новой версии — Claude Code.
5. Cursor manual config → deeplink.
6. VS Code.
7. Сравнить install completion / first success / second session / security-negative success.
8. MCPB только если native path оправдан данными.
9. ChatGPT/OpenAI только после Remote MCP.

## 0.1.0

`0.1.0` допускается только как объект forensic LP-098 verification. Новые user/client live installs для compatibility testing на ней не проводить.

## Связанные gates

- LP-098 / PR #246 — forensic public artifact/protocol verification 0.1.0; не security clearance.
- LP-103 / #256 / PR #257 — decoder allowlist runtime hardening.
- LP-104 / #258 — GitHub hosted runner blocker.
- LP-105 / #259 — public 0.1.0 containment + security release plan.

## Источники механики клиентов на дату исследования

- Claude Code MCP: https://code.claude.com/docs/en/mcp
- Claude Desktop local MCP: https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
- Anthropic Desktop Extensions/MCPB: https://www.anthropic.com/engineering/desktop-extensions
- Cursor MCP: https://prod.cursor.com/docs/mcp
- Cursor install links: https://prod.cursor.com/docs/mcp/install-links
- VS Code MCP servers: https://code.visualstudio.com/docs/agent-customization/mcp-servers
- VS Code MCP configuration: https://code.visualstudio.com/docs/agents/reference/mcp-configuration
- OpenAI API Remote MCP: https://platform.openai.com/docs/quickstart/make-your-first-api-request

Эти источники подтверждают механизмы подключения, но не совместимость LayerPorter. Совместимость появляется только после собственных exact security-fixed live tests.
