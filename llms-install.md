# Neither — agent install

Neither is decision memory for Cursor and Claude Desktop: cited Decision / Rejected / Constraint / Citation via `memory_for_file`, not flat chat memory.

Get a workspace API key: https://www.neither.online/developers/quickstart

## MCP (stdio)

Packages: `@neitherai/mcp-server@0.1.2`, CLI `neither@0.1.2`. Use `@latest` in config.

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

## Seed docs

```bash
npx -y neither@latest push ./docs
```

## Verify

Ask: `We chose JWT over session cookies in docs/adr/payment-gateway.md — why?` The agent should call `memory_for_file`.

Expected cited shape:

```
File: docs/adr/payment-gateway.md
Matches: N

Decision: …
Rejected: …
Constraint: …
Citation: …
```

## Troubleshoot

1. `NEITHER_API_KEY is required` — paste a `sk_ctx_…` key from the quickstart into MCP `env`.
2. `No cited decisions found` — run `npx -y neither@latest push ./docs` first; free history is ~3 days.
3. Server does not start — Node 20+ and `npx` must be on PATH; this is stdio only (not remote HTTP).
