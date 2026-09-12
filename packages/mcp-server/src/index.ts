#!/usr/bin/env node
/**
 * @neitherai/mcp-server — stdio MCP server for decision-memory tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readNeitherMcpConfig } from "./config.js";
import { TOOLS } from "./toolDefinitions.js";
import { NEITHER_MCP_SERVER_PACKAGE_NAME, NEITHER_MCP_SERVER_VERSION } from "./version.js";
import { runMemoryForFile } from "./tools/memoryForFile.js";
import { runMemoryPush } from "./tools/memoryPush.js";
import { runMemorySearch } from "./tools/memorySearch.js";
import { runMemorySnippetFetch } from "./tools/memorySnippetFetch.js";
import { runMemoryTimeline } from "./tools/memoryTimeline.js";

async function main(): Promise<void> {
  const config = readNeitherMcpConfig();
  const server = new Server(
    { name: NEITHER_MCP_SERVER_PACKAGE_NAME, version: NEITHER_MCP_SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    try {
      if (name === "memory_search") {
        const out = await runMemorySearch(config, {
          query: String(args.query ?? ""),
          maxResults:
            typeof args.maxResults === "number"
              ? args.maxResults
              : typeof args.max_results === "number"
                ? args.max_results
                : undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: `${out.formatted}\n\n${out.guidance}\n\n---\n${JSON.stringify({ query: out.query, results: out.results }, null, 2)}`,
            },
          ],
          structuredContent: out,
        };
      }
      if (name === "memory_for_file") {
        const symbols = Array.isArray(args.symbols)
          ? args.symbols.map((s) => String(s))
          : undefined;
        const out = await runMemoryForFile(config, {
          file_path: String(args.file_path ?? ""),
          symbols,
        });
        return {
          content: [{ type: "text", text: out.formatted }],
          structuredContent: out,
        };
      }
      if (name === "memory_snippet_fetch") {
        const out = await runMemorySnippetFetch(config, {
          source_id: String(args.source_id ?? ""),
          node_id: typeof args.node_id === "string" ? args.node_id : undefined,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(out) }],
        };
      }
      if (name === "memory_timeline") {
        const out = await runMemoryTimeline(config, {
          anchor_id: typeof args.anchor_id === "string" ? args.anchor_id : undefined,
          q: typeof args.q === "string" ? args.q : undefined,
          window: typeof args.window === "string" ? args.window : undefined,
          maxResults:
            typeof args.maxResults === "number"
              ? args.maxResults
              : typeof args.max_results === "number"
                ? args.max_results
                : undefined,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        };
      }
      if (name === "memory_push") {
        const meta =
          args.metadata && typeof args.metadata === "object"
            ? (args.metadata as Record<string, unknown>)
            : undefined;
        const out = await runMemoryPush(config, {
          content: String(args.content ?? ""),
          bc_hint: typeof args.bc_hint === "string" ? args.bc_hint : undefined,
          metadata: meta
            ? {
                source_id: typeof meta.source_id === "string" ? meta.source_id : undefined,
                occurred_at: typeof meta.occurred_at === "string" ? meta.occurred_at : undefined,
                participants: Array.isArray(meta.participants)
                  ? meta.participants.map((p) => String(p))
                  : undefined,
                thread_id: typeof meta.thread_id === "string" ? meta.thread_id : undefined,
                content_type: typeof meta.content_type === "string" ? meta.content_type : undefined,
              }
            : undefined,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        };
      }
      throw new Error(`Unknown tool: ${name}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text", text: message }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
