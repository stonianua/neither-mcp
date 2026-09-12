import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP tool descriptors returned by tools/list.
 *
 * Anthropic Connectors Directory / desktop-extension review requires every tool
 * to expose a human-readable `title` plus `readOnlyHint` or `destructiveHint`.
 * Titles are set both at the top level (MCP 2025-11-25) and under `annotations`
 * for hosts that still read `annotations.title`.
 */
function readTool(
  name: string,
  title: string,
  description: string,
  inputSchema: Tool["inputSchema"],
): Tool {
  return {
    name,
    title,
    description,
    inputSchema,
    annotations: {
      title,
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  };
}

function additiveWriteTool(
  name: string,
  title: string,
  description: string,
  inputSchema: Tool["inputSchema"],
): Tool {
  return {
    name,
    title,
    description,
    inputSchema,
    annotations: {
      title,
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  };
}

export const TOOLS: Tool[] = [
  readTool(
    "memory_search",
    "Search decision memory",
    "At a delivery fork or planning write, search workspace decision memory (NL query). Returns Decision/Citation prose — use top hits to answer; fetch at most 1–2 snippets with node_id=hit.id. Do not fall back to DB/repo archaeology for decisions.",
    {
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
  ),
  readTool(
    "memory_for_file",
    "Memory for file",
    "Hero tool at delivery forks when a repo path is in play — cited Decision/Rejected/Constraint/Citation. Prefer this over memory_search when editing or planning a specific file. Honest empty if uncovered.",
    {
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
  ),
  readTool(
    "memory_snippet_fetch",
    "Fetch memory snippet",
    "Fetch verbatim quote by provenance source_document_id. ALWAYS pass node_id = memory_search hit id so content matches that Decision title (same document can have unrelated nodes). At most 1–2 fetches per fork; then answer or abstain.",
    {
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
  ),
  readTool(
    "memory_timeline",
    "Memory timeline",
    "Time-ordered decision memory for a topic after a fork. Prefer memory_search prose first; use timeline only when sequence matters. Do not use as a substitute for answering.",
    {
      type: "object",
      properties: {
        anchor_id: { type: "string", description: "Optional source document or anchor id" },
        q: { type: "string", description: "Optional natural-language query" },
        window: { type: "string", description: "Lookback window label (default 30d)" },
        maxResults: { type: "number", description: "Max events (default 20, max 50)" },
      },
    },
  ),
  additiveWriteTool(
    "memory_push",
    "Push decision memory",
    "Close a decision or seed an ADR snippet with provenance metadata (source id, occurred_at, participants, thread id).",
    {
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
  ),
];

export function assertToolsMeetAnthropicReview(tools: Tool[]): void {
  if (tools.length === 0) {
    throw new Error("tools/list is empty");
  }
  for (const tool of tools) {
    const title = (tool.title ?? tool.annotations?.title ?? "").trim();
    if (!title) {
      throw new Error(`tool ${tool.name} is missing title`);
    }
    const readOnly = tool.annotations?.readOnlyHint;
    const destructive = tool.annotations?.destructiveHint;
    if (readOnly !== true && destructive !== true && destructive !== false) {
      throw new Error(
        `tool ${tool.name} must set annotations.readOnlyHint or annotations.destructiveHint`,
      );
    }
  }
}
