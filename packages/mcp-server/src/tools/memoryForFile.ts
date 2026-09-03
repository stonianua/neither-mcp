import type { NeitherMcpConfig } from "../config.js";
import { neitherApiFetch } from "../config.js";
import {
  formatMemoryDecisionProse,
  type MemoryDecisionProseRow,
} from "../lib/formatMemoryDecisionProse.js";

export type MemoryForFileArgs = {
  file_path: string;
  symbols?: string[];
};

export type MemoryForFileResult = {
  file_path: string;
  symbols: string[];
  bc_id: string | null;
  source_document_id: string | null;
  matches: number;
  results: Array<{
    id: string;
    title?: string | null;
    bc_id?: string | null;
    decision?: string | null;
    rejected?: string | null;
    constraint?: string | null;
    excerpt?: string | null;
    provenance?: Record<string, unknown> | null;
  }>;
  formatted: string;
};

export function formatMemoryForFileResponse(payload: MemoryForFileResult): string {
  const rows: MemoryDecisionProseRow[] = payload.results.map((row) => ({
    title: row.title,
    decision: row.decision,
    rejected: row.rejected,
    constraint: row.constraint,
    excerpt: row.excerpt,
    source_document_id:
      typeof row.provenance?.source_document_id === "string"
        ? row.provenance.source_document_id
        : null,
  }));
  return formatMemoryDecisionProse(rows, payload.file_path);
}

export async function runMemoryForFile(
  config: NeitherMcpConfig,
  args: MemoryForFileArgs,
): Promise<MemoryForFileResult> {
  const filePath = args.file_path?.trim();
  if (!filePath) {
    throw new Error("file_path is required");
  }
  const params = new URLSearchParams({ file_path: filePath });
  if (args.symbols?.length) {
    params.set("symbols", args.symbols.join(","));
  }
  const res = await neitherApiFetch(config, `/api/memory/context-for?${params.toString()}`);
  const body = (await res.json()) as MemoryForFileResult & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `memory_for_file failed (${res.status})`);
  }
  const payload: MemoryForFileResult = {
    file_path: body.file_path ?? filePath,
    symbols: body.symbols ?? args.symbols ?? [],
    bc_id: body.bc_id ?? null,
    source_document_id: body.source_document_id ?? null,
    matches: body.matches ?? body.results?.length ?? 0,
    results: body.results ?? [],
    formatted: "",
  };
  payload.formatted = formatMemoryForFileResponse(payload);
  return payload;
}
