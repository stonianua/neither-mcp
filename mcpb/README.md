# Neither MCPB

Claude Desktop one-click bundle for the Neither stdio MCP server.

Spawn is `npx -y @neitherai/mcp-server@latest` with `NEITHER_API_KEY` / `NEITHER_API_BASE`. The archive does not vendor `node_modules`.

Registry name (already published): `io.github.stonianua/neither-mcp`.

Clients: Cursor (JSON config) and Claude Desktop (this `.mcpb`). Stdio only — not remote HTTP.

## Rebuild

From the repo root:

```bash
npx -y @anthropic-ai/mcpb validate mcpb/manifest.json
npx -y @anthropic-ai/mcpb pack mcpb neither-mcp-0.1.2.mcpb
```

Or:

```bash
bash scripts/pack-mcpb.sh
```

Install the resulting `.mcpb` in Claude Desktop. Get a key at [https://www.neither.online/developers/quickstart](https://www.neither.online/developers/quickstart).

## CI

`.github/workflows/mcpb.yml` validates the manifest and packs the bundle on changes to `mcpb/` and `scripts/pack-mcpb.sh`. The `.mcpb` is a CI artifact (not committed).

## Smithery leftover

This repo does not publish to Smithery. After packing, a human logged into [smithery.ai](https://smithery.ai) can upload the stdio bundle (do not publish as remote HTTP):

```bash
npx smithery mcp publish ./neither-mcp-0.1.2.mcpb -n <your-smithery-qualified-name>
```

See [Smithery local MCPB publish](https://www.smithery.ai/docs/build/publish).
