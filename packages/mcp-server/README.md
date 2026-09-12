# @neitherai/mcp-server

Stdio MCP server for Cursor and Claude Desktop. Connects to Neither decision memory with cited provenance — not anonymous text chunks.

**Free beta** — no waitlist required. Create a workspace API key and paste it into your MCP config: [https://www.neither.online/start/?product=dev](https://www.neither.online/start/?product=dev)

## Cursor / Claude Desktop install

Add this to Cursor MCP settings (`mcp.json`) or Claude Desktop config:

```json
{
  "mcpServers": {
    "neither": {
      "command": "npx",
      "args": ["-y", "@neitherai/mcp-server@latest"],
      "env": {
        "NEITHER_API_KEY": "sk_ctx_…",
        "NEITHER_API_BASE": "https://api.neither.online"
      }
    }
  }
}
```

`NEITHER_API_KEY` is required. `NEITHER_API_BASE` defaults to `https://api.neither.online` when omitted.

## Environment variables

| Variable           | Required | Description                                                  |
| ------------------ | -------- | ------------------------------------------------------------ |
| `NEITHER_API_KEY`  | Yes      | Workspace key with `memory_read` (and `can_ingest` for push) |
| `NEITHER_API_BASE` | No       | API host (default: `https://api.neither.online`)             |

## Tools

`tools/list` includes a human-readable `title` plus `readOnlyHint` / `destructiveHint` on every tool (Anthropic desktop-extension review).

- `memory_search` — natural-language search over workspace decision memory (read-only)
- `memory_for_file` — cited Decision/Rejected/Constraint prose for a repo file path (read-only)
- `memory_snippet_fetch` — fetch verbatim snippet by source_id (read-only)
- `memory_timeline` — time-ordered memory view for a topic or anchor (read-only)
- `memory_push` — close a decision or seed an ADR snippet with provenance (additive write)

## When to call Neither

Call Neither at **delivery forks and planning writes** — when choosing between approaches or aligning strategy — not on every file open or for passive archaeology.

## Documentation

Full tool reference and provenance fields: [https://www.neither.online/docs/mcp](https://www.neither.online/docs/mcp)
