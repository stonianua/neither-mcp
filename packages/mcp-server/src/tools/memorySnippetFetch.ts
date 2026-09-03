import type { NeitherMcpConfig } from "../config.js";
import { neitherApiFetch } from "../config.js";

export type MemorySnippetFetchArgs = {
  source_id: string;
  /** Search-hit node id — prefer project_context for this node over newest doc PC row. */
  node_id?: string;
};

export type MemorySnippetFetchResult = {
  source_id: string;
  content: string;
  bc_id: string | null;
  occurred_at: string | null;
  participants: string[];
  thread_id: string | null;
  enrichment?: "ready" | "pending";
  content_scope?: "node_excerpt" | "doc_level";
  aligned_to?: "node" | "document";
  node_id?: string | null;
  title?: string | null;
};

export async function runMemorySnippetFetch(
  config: NeitherMcpConfig,
  args: MemorySnippetFetchArgs,
): Promise<MemorySnippetFetchResult> {
  const sourceId = args.source_id?.trim();
  if (!sourceId) {
    throw new Error("source_id is required");
  }
  const nodeId = typeof args.node_id === "string" ? args.node_id.trim() : "";
  const qs = nodeId ? `?node_id=${encodeURIComponent(nodeId)}` : "";
  const res = await neitherApiFetch(
    config,
    `/api/memory/snippet/${encodeURIComponent(sourceId)}${qs}`,
  );
  const body = (await res.json()) as MemorySnippetFetchResult & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const code = typeof body.error === "string" && body.error.trim() ? body.error.trim() : "";
    const msg = typeof body.message === "string" && body.message.trim() ? body.message.trim() : "";
    if (code && msg) {
      throw new Error(`${code}: ${msg}`);
    }
    throw new Error(code || msg || `memory_snippet_fetch failed (${res.status})`);
  }
  return {
    source_id: body.source_id ?? sourceId,
    content: body.content ?? "",
    bc_id: body.bc_id ?? null,
    occurred_at: body.occurred_at ?? null,
    participants: body.participants ?? [],
    thread_id: body.thread_id ?? null,
    ...(body.enrichment ? { enrichment: body.enrichment } : {}),
    ...(body.content_scope ? { content_scope: body.content_scope } : {}),
    ...(body.aligned_to ? { aligned_to: body.aligned_to } : {}),
    ...(body.node_id !== undefined ? { node_id: body.node_id } : {}),
    ...(body.title !== undefined ? { title: body.title } : {}),
  };
}
