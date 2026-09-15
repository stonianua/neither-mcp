# Neither MCP

Neither is a hosted company-context graph (decision memory) for AI agents.

## Setup

1. Create a Free-plan workspace key at https://www.neither.online/start/?product=dev
2. Install this extension:

   ```
   gemini extensions install https://github.com/stonianua/neither-mcp --ref=main
   ```

   Gemini CLI may download a GitHub Release `.mcpb` first and can fall back to cloning `main`. Accept the normal trust/fallback prompts. Enter `NEITHER_API_KEY` when prompted, or set it later with `gemini extensions config neither-mcp`.
3. Quickstart: https://www.neither.online/developers/quickstart

## Notes

- Primary tested clients: Cursor and Claude Desktop. Gemini CLI uses the same npm package `@neitherai/mcp-server@0.1.2`.
- Requires Node.js 20+.
- Support: support@neither.online