# Neither MCP

Neither is a hosted company-context graph (decision memory) for AI agents.

## Setup

1. Create an API key at https://www.neither.online/start/?product=dev
2. Install this extension (`gemini extensions install https://github.com/stonianua/neither-mcp`) and enter `NEITHER_API_KEY` when prompted.
3. Quickstart: https://www.neither.online/developers/quickstart

## Notes

- Primary tested clients: Cursor and Claude Desktop. Gemini CLI is an additional install surface and uses the same npm package `@neitherai/mcp-server@0.1.2` over stdio (`npx -y`).
- `NEITHER_API_KEY` is required (sensitive setting).
- This file does not mean a Gemini gallery card is live.
- Requires Node.js 20+.
- Support: support@neither.online
