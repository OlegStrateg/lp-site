# LP-080 — Шаг 19: проверенные источники дистрибуции

Проверено: 2026-09-09

## Official MCP Registry

- Publishing quickstart:
  https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx
- Publisher CLI commands:
  https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/cli/commands.md
- GitHub Actions publishing:
  https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx

Подтверждено:
- `mcp-publisher validate` before publish;
- package ownership verification;
- namespace authentication;
- Registry API search as post-publish verification;
- Registry remains preview at the time checked.

## Glama

- MCP FAQ / submission process:
  https://glama.ai/mcp/faq
- Indexing methodology:
  https://glama.ai/mcp/methodology
- glama.json overview:
  https://glama.ai/blog/2025-07-08-what-is-glamajson

Подтверждено:
- open-source submission originates from GitHub repository;
- maintainer ownership validation;
- source ingestion and repeated analysis;
- build/run/introspection/security/quality/health layer;
- optional metadata/ownership flow through `glama.json` where applicable.

## Smithery

- Publish docs:
  https://smithery.ai/docs/build/publish
- CLI docs:
  https://smithery.ai/docs/concepts/cli

Подтверждено:
- URL publishing requires public Streamable HTTP;
- local stdio distribution uses MCPB bundle;
- publishing supports dedicated discovery page/install flow/analytics.

## mcp.so

- Directory FAQ:
  https://chat.mcp.so/en/
- Central GitHub submission issue:
  https://github.com/chatmcp/mcpso/issues/1

Подтверждено:
- community directory;
- submission through GitHub issue/link flow;
- does not itself substitute for independent technical verification.

## awesome-mcp-servers

- Contributing guide:
  https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md
- Current PR examples enforcing Glama requirement:
  https://github.com/punkpeye/awesome-mcp-servers/pull/10108
  https://github.com/punkpeye/awesome-mcp-servers/pull/12598

Подтверждено:
- server contribution is via README PR;
- current automated review flow requires Glama listing/quality score badge for working-server verification.

## Правило обновления

Перед фактической подачей в каждый канал его requirements проверяются повторно. Этот файл фиксирует состояние на дату выше, а не вечный контракт внешних платформ.
