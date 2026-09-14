# Neither Claude Desktop extension (MCPB)

This repo can build a Claude Desktop **MCP Bundle** (`.mcpb`) for the Neither **local stdio** MCP server.

This packaging is **not** a Connectors Directory listing and is **not** a submitted Anthropic desktop extension. Do **not** submit [Anthropic’s desktop-extension form](https://claude.com/docs/connectors/building/submission) from this PR — that step is Ted-only after Windows + macOS smoke.

First-class clients: **Cursor** and **Claude Desktop**. Gemini CLI is an additional install surface (see the README). Claude Code is not a supported client.

## What gets installed

- Transport: local **stdio** (not remote HTTPS MCP; this repo has no remote MCP endpoint).
- Runtime: Claude Desktop’s bundled **Node** (`node ${__dirname}/server/index.js`). Node **20+** is required.
- Canonical npm/Cursor install remains: `npx -y @neitherai/mcp-server@latest`.
- Start / get a workspace key: [https://www.neither.online/start/?product=dev](https://www.neither.online/start/?product=dev)

## Environment variables

| Variable | Required | Where | Description |
| --- | --- | --- | --- |
| `NEITHER_API_KEY` | Yes | MCPB `user_config` (sensitive) or Cursor `mcp.json` `env` | Workspace key (`sk_ctx_…`) |
| `NEITHER_API_BASE` | No | MCPB `user_config` or env | Defaults to `https://api.neither.online` |

Privacy policy (HTTPS, live): [https://www.neither.online/privacy/](https://www.neither.online/privacy/)

## Build the `.mcpb`

From the repo root (Node 20+):

```bash
bash scripts/pack-mcpb.sh
```

That script:

1. Builds `packages/mcp-server`
2. Installs production dependencies into `mcpb/node_modules` (vendored into the zip; not committed)
3. Validates `mcpb/manifest.json`
4. Writes `neither-mcp-<manifest version>.mcpb` at the repo root (gitignored)

Equivalent manual steps (from the repo root):

```bash
cd packages/mcp-server && npm install && npm run build && cd ../..
cd mcpb && npm install --omit=dev --install-links=true --no-package-lock && cd ..
npx -y @anthropic-ai/mcpb validate mcpb/manifest.json
npx -y @anthropic-ai/mcpb pack mcpb neither-mcp-0.1.2.mcpb
```

`mcpb/node_modules` is generated at pack time. Do not commit it.

## Sideload / test in Claude Desktop

Claude Desktop runs on **macOS** and **Windows**. This cloud environment cannot run Claude Desktop; sideload and smoke must be done on a human machine.

1. Build `neither-mcp-0.1.2.mcpb` (or the version in `mcpb/manifest.json`).
2. Install the file in Claude Desktop using any of:
   - Double-click the `.mcpb`
   - Drag and drop the `.mcpb` onto the Claude Desktop window
   - **Settings → Extensions → Advanced settings → Install Extension…** and select the file
3. In the install UI, paste `NEITHER_API_KEY` (sensitive; Claude Desktop stores it in the OS keychain). Leave `NEITHER_API_BASE` at the default unless you were given another host.
4. Enable the extension and confirm the Neither tools appear (`memory_search`, `memory_for_file`, `memory_snippet_fetch`, `memory_timeline`, `memory_push`).
5. In a new conversation, exercise each tool (see the smoke checklist). Read-only tools should not write; `memory_push` is an additive ingest.

Docs Anthropic points at: [Build a desktop extension with MCPB](https://claude.com/docs/connectors/building/mcpb), [Desktop Extensions](https://www.anthropic.com/engineering/desktop-extensions).

## Windows + macOS smoke (human, before form submit)

This agent did **not** run Claude Desktop on Windows or macOS. Treat the boxes below as **unconfirmed** until a human checks them on both platforms.

Before anyone submits the Anthropic form, confirm on **Windows** and **macOS**:

- [ ] `.mcpb` installs from double-click (or drag-drop / Settings → Install Extension)
- [ ] Install UI shows name **Neither**, the privacy policy link, and required API key field
- [ ] Saving `NEITHER_API_KEY` enables the extension (empty key does not)
- [ ] Server starts with Claude’s bundled Node (no extra global `npx` install required)
- [ ] `memory_search` returns cited Decision / Citation prose or an honest empty
- [ ] `memory_for_file` with a real repo-relative path
- [ ] `memory_snippet_fetch` with `source_id` + `node_id` from a search hit
- [ ] `memory_timeline` for a topic
- [ ] `memory_push` of a non-sensitive note, then a later `memory_search` (allow enrichment)
- [ ] Optional `NEITHER_API_BASE` still defaults to `https://api.neither.online`
- [ ] Uninstall / disable does not leave a working server

Do not invent a customer story or paste untested install proof into the form.

## Anthropic form leftovers (Ted-only)

- Do **not** submit the [desktop-extension submission form](https://claude.com/docs/connectors/building/submission) from CI or this PR.
- Directory listing is a separate human step after smoke.
- Reviewers typically want: working examples that exercise **each** tool, test credentials where applicable, and the privacy policy URL already in `mcpb/manifest.json` (`privacy_policies`).
- This repo must not claim the extension is listed or submitted.

## Layout

| Path | Role |
| --- | --- |
| `mcpb/manifest.json` | MCPB manifest (`user_config`, `privacy_policies`, Node spawn) |
| `mcpb/server/index.js` | Entry: imports `@neitherai/mcp-server` |
| `mcpb/package.json` | `file:../packages/mcp-server` so the zip vendors this repo’s server |
| `mcpb/icon.png` | 512×512 PNG from Neither brand (`/brand/icon-512.png`) |
| `packages/mcp-server` | Stdio server source (`tools/list` includes `title` + hints) |
| `scripts/pack-mcpb.sh` | Canonical pack command |
| `scripts/pack-gemini-extension.sh` | Gemini CLI github-release `.tar.gz` / `.zip` (does not replace the `.mcpb`) |

## GitHub Release assets (Claude `.mcpb` vs Gemini CLI)

Keep `neither-mcp-<version>.mcpb` on the GitHub Release. That is the Claude Desktop sideload file.

Gemini CLI 0.59 `gemini extensions install https://github.com/stonianua/neither-mcp` prefers a github-release asset and only extracts `.tar.gz` / `.zip`. If the `.mcpb` is the **only** custom asset, 0.59 downloads it, fails to extract, then `git clone` into the same temp dir fails. CI attaches `linux.neither-mcp.tar.gz`, `darwin.neither-mcp.tar.gz`, and `win32.neither-mcp.zip` (same stdio `npx` extension; `gemini-extension.json` at archive root) **in addition to** the `.mcpb`. Do not delete the `.mcpb` to “fix” Gemini.

## Privacy (connector)

See the **Privacy Policy** section in the root [README.md](./README.md) and [https://www.neither.online/privacy/](https://www.neither.online/privacy/).
