# Neither MCPB

Claude Desktop one-click bundle for the Neither **local stdio** MCP server.

Canonical pack and sideload steps, env vars, and the Windows + macOS smoke checklist: **[DESKTOP-EXTENSION.md](../DESKTOP-EXTENSION.md)**.

This packaging is not a Connectors Directory listing and is not a submitted Anthropic extension.

## Rebuild

From the repo root (Node 20+):

```bash
bash scripts/pack-mcpb.sh
```

The archive vendors `node_modules` and spawns `node ${__dirname}/server/index.js` (Claude Desktop’s bundled Node). Cursor JSON config still uses `npx -y @neitherai/mcp-server@latest`.

## CI

`.github/workflows/mcpb.yml` builds the server, runs annotation tests, validates the manifest, packs the bundle, then extracts the `.mcpb` outside the checkout and launches the manifest entry point (no repo `node_modules`, npm, or npx) for initialize / tools/list and a missing-key check. Authenticated retrieval runs only when a workspace key is present in same-repo CI secrets; otherwise it is reported **NOT TESTED**. The `.mcpb` is a CI artifact (not committed).

## GitHub About leftover

Cursor’s git token can push releases but cannot PATCH repo metadata. A repo admin (`gh auth login` as `stonianua`) should set description and topics (do **not** add `claude-code`):

```bash
gh repo edit stonianua/neither-mcp \
  --description "Decision memory MCP for Cursor and Claude Desktop — cited Decision / Rejected / Constraint / supersession, not flat chat memory." \
  --add-topic mcp \
  --add-topic model-context-protocol \
  --add-topic ai-memory \
  --add-topic agent-memory \
  --add-topic cursor \
  --add-topic knowledge-graph \
  --add-topic context-engineering \
  --add-topic developer-tools
```

## Smithery leftover

This repo does not publish to Smithery. After packing, a human logged into [smithery.ai](https://smithery.ai) can upload the stdio bundle (do not publish as remote HTTP):

```bash
npx smithery mcp publish ./neither-mcp-0.1.2.mcpb -n <your-smithery-qualified-name>
```

See [Smithery local MCPB publish](https://www.smithery.ai/docs/build/publish).
