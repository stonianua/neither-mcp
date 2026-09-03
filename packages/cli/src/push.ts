import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const PUSH_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
export const DEFAULT_PUSH_BATCH_SIZE = 20;

import { NEITHER_CLI_VERSION } from "./version.js";

export { NEITHER_CLI_VERSION };

export type PushFileItem = {
  source_id: string;
  content_type: "document";
  text: string;
  title?: string;
};

export type NeitherCliConfig = {
  apiBase: string;
  apiKey: string;
};

export function readNeitherCliConfig(env: NodeJS.ProcessEnv = process.env): NeitherCliConfig {
  const apiKey = (env.NEITHER_API_KEY ?? "").trim();
  const apiBase = (env.NEITHER_API_BASE ?? env.NEITHER_API_URL ?? "https://api.neither.online")
    .trim()
    .replace(/\/+$/, "");
  if (!apiKey) {
    throw new Error("NEITHER_API_KEY is required (sk_ctx_* bearer token with can_ingest)");
  }
  return { apiBase, apiKey };
}

export function isPushableFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return PUSH_EXTENSIONS.has(ext);
}

export async function collectPushFiles(rootDir: string, cwd = process.cwd()): Promise<string[]> {
  const absRoot = path.resolve(cwd, rootDir);
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (entry.isFile() && isPushableFile(entry.name)) {
        out.push(full);
      }
    }
  }

  const rootStat = await stat(absRoot);
  if (!rootStat.isDirectory()) {
    if (isPushableFile(absRoot)) {
      out.push(absRoot);
    }
    return out.sort();
  }
  await walk(absRoot);
  return out.sort();
}

export function toRepoRelativeSourceId(absPath: string, cwd = process.cwd()): string {
  const rel = path.relative(cwd, absPath);
  return rel.split(path.sep).join("/");
}

export async function buildPushItems(
  rootDir: string,
  cwd = process.cwd(),
): Promise<PushFileItem[]> {
  const files = await collectPushFiles(rootDir, cwd);
  const items: PushFileItem[] = [];
  for (const abs of files) {
    const text = await readFile(abs, "utf8");
    if (!text.trim()) continue;
    const source_id = toRepoRelativeSourceId(abs, cwd);
    items.push({
      source_id,
      content_type: "document",
      text,
      title: path.basename(abs),
    });
  }
  return items;
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export type PushBatchResult = {
  batchIndex: number;
  itemCount: number;
  status: number;
  ok: boolean;
  body: unknown;
};

export async function pushBatch(
  config: NeitherCliConfig,
  items: PushFileItem[],
  batchIndex: number,
  opts?: { correlationId?: string },
): Promise<PushBatchResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": `neither-cli/${NEITHER_CLI_VERSION}`,
  };
  const correlationId = opts?.correlationId?.trim();
  if (correlationId) {
    headers["X-Correlation-ID"] = correlationId;
  }
  const res = await fetch(`${config.apiBase}/api/ingest/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ items }),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return {
    batchIndex,
    itemCount: items.length,
    status: res.status,
    ok: res.ok,
    body,
  };
}

export type PushSummary = {
  filesDiscovered: number;
  filesPushed: number;
  batches: PushBatchResult[];
  ok: boolean;
};

export async function runPush(
  rootDir: string,
  options?: { cwd?: string; batchSize?: number; config?: NeitherCliConfig },
): Promise<PushSummary> {
  const cwd = options?.cwd ?? process.cwd();
  const config = options?.config ?? readNeitherCliConfig();
  const batchSize = options?.batchSize ?? DEFAULT_PUSH_BATCH_SIZE;
  const items = await buildPushItems(rootDir, cwd);
  const batches: PushBatchResult[] = [];
  const correlationId = `neither-cli/${randomUUID()}`;
  for (const [idx, chunk] of chunkItems(items, batchSize).entries()) {
    const result = await pushBatch(config, chunk, idx + 1, { correlationId });
    batches.push(result);
    if (!result.ok) {
      return {
        filesDiscovered: items.length,
        filesPushed: batches.slice(0, -1).reduce((n, b) => n + b.itemCount, 0),
        batches,
        ok: false,
      };
    }
  }
  return {
    filesDiscovered: items.length,
    filesPushed: items.length,
    batches,
    ok: true,
  };
}
