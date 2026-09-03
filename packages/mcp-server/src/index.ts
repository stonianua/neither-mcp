#!/usr/bin/env node
/**
 * @neitherai/mcp-server — stdio MCP server for decision-memory tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readNeitherMcpConfig } from "./config.js";
import { NEITHER_MCP_SERVER_PACKAGE_NAME, NEITHER_MCP_SERVER_VERSION } from "./version.js";
import { runMemoryForFile } from "./tools/memoryForFile.js";
import { runMemoryPush } from "./tools/memoryPush.js";
import { runMemorySearch } from "./tools/memorySearch.js";
import { runMemorySnippetFetch } from "./tools/memorySnippetFetch.js";
import { runMemoryTimeline } from "./tools/memoryTimeline.js";

const TOOLS = [
  {
    name: "memory_search",
    description:
      "At a delivery fork or planning write, search workspace decision memory (NL query). Returns Decision/Citation prose — use top hits to answer; fetch at most 1–2 snippets with node_id=hit.id. Do not fall back to DB/repo archaeology for decisions.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        maxResults: {
          type: "number",
          description: "Max results (default 10, max 50). Prefer ≤8 at forks.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_for_file",
    description:
      "Hero tool at delivery forks when a repo path is in play — cited Decision/Rejected/Constraint/Citation. Prefer this over memory_search when editing or planning a specific file. Honest empty if uncovered.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Repo-relative file path" },
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "Optional symbol or topic hints",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "memory_snippet_fetch",
    description:
      "Fetch verbatim quote by provenance source_document_id. ALWAYS pass node_id = memory_search hit id so content matches that Decision title (same document can have unrelated nodes). At most 1–2 fetches per fork; then answer or abstain.",
    inputSchema: {
      type: "object",
      properties: {
        source_id: {
          type: "string",
          description: "Provenance source_document_id from a search hit",
        },
        node_id: {
          type: "string",
          description:
            "Required for alignment: search hit id (node) — prefers that node's project_context",
        },
      },
      required: ["source_id"],
    },
  },
  {
    name: "memory_timeline",
    description:
      "Time-ordered decision memory for a topic after a fork. Prefer memory_search prose first; use timeline only when sequence matters. Do not use as a substitute for answering.",
    inputSchema: {
      type: "object",
      properties: {
        anchor_id: { type: "string", description: "Optional source document or anchor id" },
        q: { type: "string", description: "Optional natural-language query" },
        window: { type: "string", description: "Lookback window label (default 30d)" },
        maxResults: { type: "number", description: "Max events (default 20, max 50)" },
      },
    },
  },
  {
    name: "memory_push",
    description:
      "Close a decision or seed an ADR snippet with provenance metadata (source id, occurred_at, participants, thread id).",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Snippet text" },
        bc_hint: { type: "string", description: "Optional business-context hint uuid" },
        metadata: {
          type: "object",
          properties: {
            source_id: { type: "string" },
            occurred_at: { type: "string" },
            participants: { type: "array", items: { type: "string" } },
            thread_id: { type: "string" },
            content_type: { type: "string" },
          },
        },
      },
      required: ["content"],
    },
  },
] as const;

async function main(): Promise<void> {
  const config = readNeitherMcpConfig();
  const server = new Server(
    { name: NEITHER_MCP_SERVER_PACKAGE_NAME, version: NEITHER_MCP_SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
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
