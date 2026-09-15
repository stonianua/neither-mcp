# Neither — agent install

Neither is decision memory for Cursor and Claude Desktop (Gemini CLI is an additional install surface): cited Decision / Rejected / Constraint / Citation, not flat chat memory.

- `memory_search` — natural-language query. Use this to verify a note you just pushed.
- `memory_for_file` — only when a real repo-relative `file_path` is supplied. Do not call it for general questions without a path.

Get a workspace key: https://www.neither.online/developers/quickstart

Do not put the workspace key in chat, feedback, or GitHub, and do not ask the user to paste it there. Set it only in the MCP client config and in the CLI terminal session (steps 2-3).

## First use

### 1. Choose one note

Pick one existing, non-sensitive project note — a single markdown or text file. Do not push a whole folder on first use.

### 2. MCP (stdio)

Packages: `@neitherai/mcp-server@latest`, CLI `neither@latest`.

Put the workspace key in the MCP client `env` (Cursor `mcp.json`, Claude Desktop config, or Gemini CLI’s `NEITHER_API_KEY` extension setting):

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

The CLI does not read this file. A working MCP connection does not set `NEITHER_API_KEY` for `npx neither`.

### 3. CLI terminal (same workspace key)

In the same terminal that will run `npx`, set the same workspace key on the CLI process environment.

macOS / Linux:

```bash
export NEITHER_API_KEY='sk_ctx_…'
```

PowerShell:

```powershell
$env:NEITHER_API_KEY = "sk_ctx_…"
```

This lasts for the current terminal session. `NEITHER_API_BASE` is optional (default `https://api.neither.online`).

### 4. Push that file

```bash
npx -y neither@latest push path/to/your-note.md
```

Replace with the real path of the file from step 1. The CLI already accepts a file or a directory; first use should be one file.

### 5. Fresh conversation — `memory_search`

Open a **new** conversation. Explicitly ask Neither to `memory_search` a fact from that note, for example:

`Use Neither memory_search for: <distinctive decision or constraint from that note>. Cite the source.`

Do not use `memory_for_file` unless you also pass that note's real `file_path`.

### 6. Inspect the result and its source

Check the tool output: Decision / Rejected / Constraint / Citation, and the source (`File:` line, provenance, `source_document_id`). If you have the repo-relative path of the note, you may then call `memory_for_file` with that `file_path`.

Expected cited shape:

```
File: search:<your query>
Matches: N

Decision: …
Rejected: …
Constraint: …
Citation: …
```

## Optional: neither-demo

No project note yet? Clone https://github.com/stonianua/neither-demo, set the CLI shell env (step 3), and push **one** file:

```bash
npx -y neither@latest push ./docs/001-database.md
```

Then in a fresh conversation, `memory_search` that note (for example, the Postgres constraint). Sample topics map to `docs/004-rejected-kafka.md`, `docs/002-auth.md` / `docs/005-auth-superseded.md`, and `docs/001-database.md` — pass those as `file_path` only if you call `memory_for_file`.

## Troubleshoot

1. `NEITHER_API_KEY is required` — the same workspace key must be in **both** the MCP client `env` **and** the CLI shell env (`export` on macOS/Linux, `$env:NEITHER_API_KEY` in PowerShell). The CLI reads only its process environment; it does not read MCP client config. Do not put the key in chat, feedback, or GitHub.
2. `No cited decisions found` — push the note first (`npx -y neither@latest push path/to/your-note.md`); history is limited (~3 days on the free plan). Optional sample: clone neither-demo and push one file under `docs/`.
3. `file_path is required` — `memory_for_file` needs a real repo-relative path. For a general question, call `memory_search` with a query instead.
4. Server does not start — Node 20+ and `npx` must be on PATH; this is stdio only (not remote HTTP).
