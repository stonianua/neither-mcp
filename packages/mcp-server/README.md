# @neitherai/mcp-server

Stdio MCP server for Cursor and other agent IDEs. Connects to Neither decision memory with cited provenance — not anonymous text chunks.

**Free beta** — no waitlist required. Create a workspace API key and paste it into your MCP config.

## Cursor install

Add this to your Cursor MCP settings (`mcp.json`):

```json
{
  "mcpServers": {
    "neither": {
      "command": "npx",
      "args": ["-y", "@neitherai/mcp-server@latest"],
      "env": {
        "NEITHER_API_KEY": "sk_ctx_your_workspace_key",
        "NEITHER_API_BASE": "https://api.neither.online"
      }
    }
  }
}
```

`NEITHER_API_BASE` defaults to `https://api.neither.online` when omitted.

## Environment variables

| Variable           | Required | Description                                                  |
| ------------------ | -------- | ------------------------------------------------------------ |
| `NEITHER_API_KEY`  | Yes      | Workspace key with `memory_read` (and `can_ingest` for push) |
| `NEITHER_API_BASE` | No       | API host (default: `https://api.neither.online`)             |

## Tools

- `memory_search` — natural-language search over workspace decision memory
- `memory_for_file` — cited Decision/Rejected/Constraint prose for a repo file path
- `memory_snippet_fetch` — fetch verbatim snippet by source_id
- `memory_timeline` — time-ordered memory view for a topic or anchor
- `memory_push` — close a decision or seed an ADR snippet with provenance

## When to call Neither

Call Neither at **delivery forks and planning writes** — when choosing between approaches or aligning strategy — not on every file open or for passive archaeology.

## Documentation

Full tool reference and provenance fields: [https://www.neither.online/docs/mcp](https://www.neither.online/docs/mcp)

Get a free API key: [https://www.neither.online/developers/quickstart](https://www.neither.online/developers/quickstart)
