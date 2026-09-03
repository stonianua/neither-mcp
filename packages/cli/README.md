# neither

Neither CLI — push local docs to decision memory from your terminal.

**Free beta** — no checkout required.

## Install

Zero-setup (npx):

```bash
npx -y neither@latest --help
```

Homebrew (macOS / Linuxbrew):

```bash
brew install stonianua/neither/neither
neither --help
```

## Environment variables

| Variable           | Required | Description                                      |
| ------------------ | -------- | ------------------------------------------------ |
| `NEITHER_API_KEY`  | Yes      | Workspace key from the API Console               |
| `NEITHER_API_BASE` | No       | API host (default: `https://api.neither.online`) |

## Quick start

```bash
export NEITHER_API_KEY=sk_ctx_your_workspace_key
export NEITHER_API_BASE=https://api.neither.online
npx -y neither@latest push ./docs
```

## Commands

- `neither init` — scaffold config in your repo
- `neither push <path>` — push markdown/text to decision memory
- `neither watch <path>` — watch a directory for changes
- `neither whoami` — show authenticated workspace

## Documentation

CLI reference: [https://www.neither.online/docs/cli](https://www.neither.online/docs/cli)

Get a free API key: [https://www.neither.online/developers/quickstart](https://www.neither.online/developers/quickstart)
