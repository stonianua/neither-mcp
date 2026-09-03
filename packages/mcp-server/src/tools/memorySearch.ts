import type { NeitherMcpConfig } from "../config.js";
import { neitherApiFetch } from "../config.js";
import {
  formatMemoryDecisionProse,
  type MemoryDecisionProseRow,
} from "../lib/formatMemoryDecisionProse.js";

export type MemorySearchArgs = {
  query: string;
  maxResults?: number;
};

type SearchHit = MemoryDecisionProseRow & {
  id?: string;
  title?: string | null;
  bc_id?: string | null;
  decision?: string | null;
  rejected?: string | null;
  constraint?: string | null;
  excerpt?: string | null;
  score?: number;
  provenance?: {
    source_document_id?: string | null;
  } | null;
  retrieval_mode?: string;
};

export type MemorySearchResult = {
  query: string;
  results: SearchHit[];
  /** Agent-facing Decision/Citation prose — prefer this over raw titles. */
  formatted: string;
  guidance: string;
};

export function formatMemorySearchResponse(payload: {
  query: string;
  results: SearchHit[];
}): MemorySearchResult {
  const rows: MemoryDecisionProseRow[] = (payload.results ?? []).map((row) => ({
    title: row.title,
    decision: row.decision,
    rejected: row.rejected,
    constraint: row.constraint,
    excerpt: row.excerpt,
  }));
  const formatted =
    rows.length === 0
      ? `No decision memory hits for query: ${payload.query}`
      : formatMemoryDecisionProse(rows, `search:${payload.query}`);
  return {
    query: payload.query,
    results: payload.results ?? [],
    formatted,
    guidance:
      "At a delivery fork: use top hits (Decision/Citation above). Fetch at most 1–2 snippets with memory_snippet_fetch(source_id, node_id=hit.id). Then answer or abstain — do not query the DB or repo for workspace decisions.",
  };
}

export async function runMemorySearch(
  config: NeitherMcpConfig,
  args: MemorySearchArgs,
): Promise<MemorySearchResult> {
  const q = args.query?.trim();
  if (!q) {
    throw new Error("query is required");
  }
  const limit = Math.min(50, Math.max(1, args.maxResults ?? 10));
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await neitherApiFetch(config, `/api/context/search?${params.toString()}`);
  const body = (await res.json()) as {
    results?: SearchHit[];
    query?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `memory_search failed (${res.status})`);
  }
  return formatMemorySearchResponse({
    query: body.query ?? q,
    results: body.results ?? [],
  });
}
