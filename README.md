# neither-mcp

Public source mirror for the Neither CLI and MCP server.

Neither is decision memory for **Cursor** and **Claude Desktop**. Start / get a workspace API key: [https://www.neither.online/start/?product=dev](https://www.neither.online/start/?product=dev)

### Try Neither in Cursor

Get your workspace key from [https://www.neither.online/start/?product=dev](https://www.neither.online/start/?product=dev).

Then [Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=neither&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBuZWl0aGVyYWkvbWNwLXNlcnZlckBsYXRlc3QiXSwiZW52Ijp7Ik5FSVRIRVJfQVBJX0tFWSI6IlJFUExBQ0VfV0lUSF9ZT1VSX1dPUktTUEFDRV9LRVkiLCJORUlUSEVSX0FQSV9CQVNFIjoiaHR0cHM6Ly9hcGkubmVpdGhlci5vbmxpbmUifX0=):

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=neither&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBuZWl0aGVyYWkvbWNwLXNlcnZlckBsYXRlc3QiXSwiZW52Ijp7Ik5FSVRIRVJfQVBJX0tFWSI6IlJFUExBQ0VfV0lUSF9ZT1VSX1dPUktTUEFDRV9LRVkiLCJORUlUSEVSX0FQSV9CQVNFIjoiaHR0cHM6Ly9hcGkubmVpdGhlci5vbmxpbmUifX0=)
[![Add to Cursor](https://cursor.com/deeplink/mcp-install-light.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=neither&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBuZWl0aGVyYWkvbWNwLXNlcnZlckBsYXRlc3QiXSwiZW52Ijp7Ik5FSVRIRVJfQVBJX0tFWSI6IlJFUExBQ0VfV0lUSF9ZT1VSX1dPUktTUEFDRV9LRVkiLCJORUlUSEVSX0FQSV9CQVNFIjoiaHR0cHM6Ly9hcGkubmVpdGhlci5vbmxpbmUifX0=)

Configure the key locally in Cursor (replace `REPLACE_WITH_YOUR_WORKSPACE_KEY`). Node.js 20+ required.

Then follow the existing own-project walkthrough: [llms-install.md](./llms-install.md) (first-use section).

## MCP server (Cursor / Claude Desktop)

Canonical install: `npx -y @neitherai/mcp-server@latest`

**Fallback** — add this to Cursor MCP settings (`mcp.json`) or Claude Desktop config:

```json
{
  "mcpServers": {
    "neither": {
      "command": "npx",
      "args": ["-y", "@neitherai/mcp-server@latest"],
      "env": {
        "NEITHER_API_KEY": "REPLACE_WITH_YOUR_WORKSPACE_KEY",
        "NEITHER_API_BASE": "https://api.neither.online"
      }
    }
  }
}
```

- `NEITHER_API_KEY` — required workspace key
- `NEITHER_API_BASE` — optional; defaults to `https://api.neither.online`

Docs: [https://www.neither.online/docs/mcp](https://www.neither.online/docs/mcp)

The root `Dockerfile` builds this stdio server (not a remote HTTP process) so hosts such as [Glama](https://glama.ai/mcp/servers/stonianua/neither-mcp) can introspect `tools/list`. The image sets a placeholder `NEITHER_API_KEY` so the process can start; inject a real workspace key at run time.

Agent install: [llms-install.md](./llms-install.md)

## Claude Desktop (MCPB)

One-click local stdio bundle for Claude Desktop. Pack command:

```bash
bash scripts/pack-mcpb.sh
```

That vendors `packages/mcp-server` into the `.mcpb` and spawns Claude’s bundled Node (`node ${__dirname}/server/index.js`). Cursor JSON config still uses `npx -y @neitherai/mcp-server@latest`.

Sideload steps, env vars, and the Windows + macOS smoke checklist (human; not run in CI): [DESKTOP-EXTENSION.md](./DESKTOP-EXTENSION.md).

This packaging does **not** mean the extension is listed or submitted to Anthropic.

See also [mcpb/README.md](./mcpb/README.md). CI may attach a built `.mcpb`.

## Cursor Marketplace packaging

This repo is a **single Cursor Plugin** (not a multi-plugin marketplace). Manifests follow [cursor/plugin-template](https://github.com/cursor/plugin-template) and the [Cursor Plugins reference](https://cursor.com/docs/reference/plugins):

| Path | Role |
| --- | --- |
| `.cursor-plugin/plugin.json` | Cursor Plugin manifest + `NEITHER_API_KEY` user variable |
| `mcp.json` | Local stdio MCP: `npx -y @neitherai/mcp-server@latest` |

There is no `.cursor-plugin/marketplace.json` (that file is only for multi-plugin repos). There is no remote MCP URL and no OAuth-only install path.

After a marketplace install, set `NEITHER_API_KEY` under **Plugins → Configure** (workspace key from [quickstart](https://www.neither.online/developers/quickstart)). Node 20+ and `npx` must be on PATH. This packaging does **not** mean Neither is listed on the Cursor Marketplace; a maintainer still submits the public repo at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) for manual review.

Try-it sample: [https://github.com/stonianua/neither-demo](https://github.com/stonianua/neither-demo)

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

## Privacy Policy

The Neither privacy policy (collection, use and storage, third-party sharing / subprocessors, retention, and contact) is published at [https://www.neither.online/privacy/](https://www.neither.online/privacy/). Privacy contact: [privacy@neither.online](mailto:privacy@neither.online). Support: [support@neither.online](mailto:support@neither.online).

This repository’s MCP server and Claude Desktop extension are a **local stdio** process. They are not a remote HTTPS MCP server.

- **Collection.** Tool arguments you or the model supply (search queries, repo-relative file paths, snippet ids, and for `memory_push` snippet text and optional provenance). The workspace API key is sent as an HTTP Bearer token to the Neither API (`NEITHER_API_BASE`, default `https://api.neither.online`).
- **Use and storage.** The local process uses the key only to call that API. Claude Desktop stores sensitive `user_config` values in the OS keychain. Neither stores workspace decision memory as described in the privacy policy.
- **Third-party sharing.** The connector sends requests to the Neither API host you configure. Neither’s subprocessors and sharing rules are in the privacy policy. This connector does not add a second vendor beyond that API host.
- **Retention.** Per the privacy policy, workspace data is kept while the account is active; account or data deletion is removed within 30 days (backup window). The local extension does not keep a second copy of API responses on disk.
- **Contact.** [privacy@neither.online](mailto:privacy@neither.online), [support@neither.online](mailto:support@neither.online), or [GitHub issues](https://github.com/stonianua/neither-mcp/issues).

## Issues

Report bugs and feature requests at [https://github.com/stonianua/neither-mcp/issues](https://github.com/stonianua/neither-mcp/issues).

## Repository layout

| Path | Package |
| --- | --- |
| `packages/mcp-server/` | `@neitherai/mcp-server` |
| `packages/cli/` | `neither` CLI |
| `mcpb/` | Claude Desktop MCPB (bundled Node stdio) |
| `DESKTOP-EXTENSION.md` | Build, sideload, env, Win/macOS smoke checklist |
| `.cursor-plugin/plugin.json` | Cursor Plugin manifest (marketplace packaging) |
| `mcp.json` | Cursor Plugin stdio MCP config (`npx` spawn) |
| `llms-install.md` | Short agent-installable steps |

License: MIT (see LICENSE).
