# neither-demo

Clone this folder and see whether your agent knows why these decisions were made.

Sample Architecture Decision Records for Neither — cited Decision / Rejected / Constraint / Citation / supersession, not flat chat memory. For **Cursor** and **Claude Desktop** (stdio MCP). Push these docs, then ask why at a file-path fork.

Get a workspace API key: https://www.neither.online/developers/quickstart

## Push

From this folder (`examples/neither-demo/` in the `neither-mcp` repo):

```bash
export NEITHER_API_KEY=sk_ctx_your_key
export NEITHER_API_BASE=https://api.neither.online
npx -y neither@latest push ./docs
```

From the `neither-mcp` repo root instead:

```bash
npx -y neither@latest push ./examples/neither-demo/docs
```

(`source_id` / `memory_for_file` paths follow the cwd-relative path you pushed.)

## MCP (stdio)

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

Packages: `@neitherai/mcp-server@0.1.2`, CLI `neither@0.1.2`. Use `@latest` in config. Full agent steps: [llms-install.md](../../llms-install.md).

## Ask why

After push, at a delivery fork call `memory_for_file`:

1. Why didn't we use Kafka? (`docs/004-rejected-kafka.md`)
2. What replaced the original auth decision? (`docs/002-auth.md` superseded by `docs/005-auth-superseded.md`)
3. What constraint caused us to choose Postgres? (`docs/001-database.md`)

Expect cited Decision / Rejected / Constraint / Citation prose. Free history is ~3 days.

If a separate public `neither-demo` repo is published later, this folder can split out. This in-tree copy is the linkable proof:

https://github.com/stonianua/neither-mcp/tree/main/examples/neither-demo
