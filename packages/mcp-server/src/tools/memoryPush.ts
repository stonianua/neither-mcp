import type { NeitherMcpConfig } from "../config.js";
import { neitherApiFetch } from "../config.js";

export type MemoryPushArgs = {
  content: string;
  bc_hint?: string;
  metadata?: {
    source_id?: string;
    occurred_at?: string;
    participants?: string[];
    thread_id?: string;
    content_type?: string;
  };
};

export type MemoryPushResult = {
  snippet_id: string;
  source_id: string;
  job_id: string;
  mode: "sync" | "async";
  status_url: string | null;
  enrichment: "pending" | "ready";
  metadata: {
    occurred_at: string | null;
    bc_id: string | null;
    participants: string[];
    thread_id: string | null;
  };
  formatted: string;
};

export function formatMemoryPushResponse(result: MemoryPushResult): string {
  const lines = [
    `Snippet accepted (enrichment: ${result.enrichment}).`,
    `source_id: ${result.source_id}`,
    `job_id: ${result.job_id}`,
  ];
  if (result.status_url) {
    lines.push(`status_url: ${result.status_url}`);
  }
  lines.push(
    "",
    "Guidance: Snippet text is available now (or shortly) via memory_snippet_fetch using source_id — raw document_text is served while enrichment is pending. memory_search and memory_timeline need enrichment to complete; poll status_url or retry after the ingest job finishes.",
  );
  return lines.join("\n");
}

export async function runMemoryPush(
  config: NeitherMcpConfig,
  args: MemoryPushArgs,
): Promise<MemoryPushResult> {
  const content = args.content?.trim();
  if (!content) {
    throw new Error("content is required");
  }
  const res = await neitherApiFetch(config, "/api/memory/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      bc_hint: args.bc_hint,
      metadata: args.metadata,
    }),
  });
  const body = (await res.json()) as Omit<MemoryPushResult, "formatted"> & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `memory_push failed (${res.status})`);
  }
  const payload: MemoryPushResult = {
    snippet_id: body.snippet_id,
    source_id: body.source_id,
    job_id: body.job_id,
    mode: body.mode,
    status_url: body.status_url ?? null,
    enrichment: body.enrichment ?? "pending",
    metadata: body.metadata,
    formatted: "",
  };
  payload.formatted = formatMemoryPushResponse(payload);
  return payload;
}
