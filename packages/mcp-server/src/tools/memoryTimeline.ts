import type { NeitherMcpConfig } from "../config.js";
import { neitherApiFetch } from "../config.js";

export type MemoryTimelineArgs = {
  anchor_id?: string;
  q?: string;
  window?: string;
  maxResults?: number;
};

export type MemoryTimelineEvent = {
  id: string;
  title: string | null;
  occurred_at: string;
  bc_id: string | null;
  source_id: string | null;
  participants: string[];
  thread_id: string | null;
  evidence?: {
    source_document_id?: string | null;
    citation?: string | null;
  } | null;
};

export async function runMemoryTimeline(
  config: NeitherMcpConfig,
  args: MemoryTimelineArgs,
): Promise<{
  anchor_id: string | null;
  query: string | null;
  window: string;
  events: MemoryTimelineEvent[];
}> {
  const params = new URLSearchParams();
  if (args.anchor_id?.trim()) params.set("anchor_id", args.anchor_id.trim());
  if (args.q?.trim()) params.set("q", args.q.trim());
  if (args.window?.trim()) params.set("window", args.window.trim());
  const limit = Math.min(50, Math.max(1, args.maxResults ?? 20));
  params.set("limit", String(limit));
  const res = await neitherApiFetch(config, `/api/memory/timeline?${params.toString()}`);
  const body = (await res.json()) as {
    events?: MemoryTimelineEvent[];
    anchor_id?: string | null;
    query?: string | null;
    window?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `memory_timeline failed (${res.status})`);
  }
  return {
    anchor_id: body.anchor_id ?? null,
    query: body.query ?? null,
    window: body.window ?? "30d",
    events: body.events ?? [],
  };
}
