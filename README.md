# neither-mcp

Public source mirror for the Neither CLI and MCP server.

Neither is decision memory for **Cursor** and **Claude Desktop**. Get a workspace API key: [https://www.neither.online/developers/quickstart](https://www.neither.online/developers/quickstart)

## MCP server (Cursor / Claude Desktop)

Canonical install: `npx -y @neitherai/mcp-server@latest`

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

- `NEITHER_API_KEY` — required workspace key
- `NEITHER_API_BASE` — optional; defaults to `https://api.neither.online`

Docs: [https://www.neither.online/docs/mcp](https://www.neither.online/docs/mcp)

## CLI

Push local docs to decision memory (separate from MCP install):

```bash
npx -y neither@latest push <path>
```

Homebrew (macOS / Linuxbrew):

```bash
brew install stonianua/neither/neither
```

Docs: [https://www.neither.online/docs/cli](https://www.neither.online/docs/cli)

## Packages

Published npm packages:

- [`@neitherai/mcp-server`](https://www.npmjs.com/package/@neitherai/mcp-server) — MCP server for Cursor and Claude Desktop
- [`neither`](https://www.npmjs.com/package/neither) — CLI for pushing local docs to decision memory

## Issues

Report bugs and feature requests at [https://github.com/stonianua/neither-mcp/issues](https://github.com/stonianua/neither-mcp/issues).

## Repository layout

| Path | Package |
| --- | --- |
| `packages/mcp-server/` | `@neitherai/mcp-server` |
| `packages/cli/` | `neither` CLI |

License: MIT (see LICENSE).
