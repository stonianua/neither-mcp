import type { NeitherMcpConfig } from "../config.js";
import { neitherApiFetch } from "../config.js";

export type QuotaExceededPayload = {
  error: "quota_exceeded";
  quota: "stored_bytes" | "memory_reads_daily" | "business_contexts" | "workspaces";
  tier?: string | null;
  limit?: number | null;
  used?: number | null;
  requested?: number | null;
  remaining?: number | null;
  message?: string;
};

export type HistoryDepthExceededPayload = {
  error: "history_depth_exceeded";
  history_depth_days?: number | null;
  event_at?: string | null;
  cutoff_at?: string | null;
  message?: string;
};

export type RateLimitedPayload = {
  error: "rate_limited";
  class?: string;
  limit?: number;
  retry_after_seconds?: number;
};

export type NeitherMcpStructuredErrorPayload =
  | QuotaExceededPayload
  | HistoryDepthExceededPayload
  | RateLimitedPayload
  | { error: string; message?: string; [key: string]: unknown };

export class NeitherMcpApiError extends Error {
  readonly status: number;
  readonly structuredContent: NeitherMcpStructuredErrorPayload;

  constructor(
    status: number,
    structuredContent: NeitherMcpStructuredErrorPayload,
    message?: string,
  ) {
    const fallback =
      typeof structuredContent.error === "string"
        ? structuredContent.error
        : `API request failed (${status})`;
    const payloadMessage =
      "message" in structuredContent && typeof structuredContent.message === "string"
        ? structuredContent.message
        : fallback;
    super(message ?? payloadMessage);
    this.name = "NeitherMcpApiError";
    this.status = status;
    this.structuredContent = structuredContent;
  }

  static fromResponse(status: number, body: unknown): NeitherMcpApiError {
    const payload =
      body !== null && typeof body === "object"
        ? (body as NeitherMcpStructuredErrorPayload)
        : { error: `http_${status}` };
    return new NeitherMcpApiError(status, payload);
  }

  get isQuotaExceeded(): boolean {
    return this.structuredContent.error === "quota_exceeded";
  }

  get isHistoryDepthExceeded(): boolean {
    return this.structuredContent.error === "history_depth_exceeded";
  }

  get isRateLimited(): boolean {
    return this.structuredContent.error === "rate_limited";
  }
}

export async function neitherApiJson<T extends Record<string, unknown>>(
  config: NeitherMcpConfig,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  const res = await neitherApiFetch(config, path, init);
  let body: T;
  try {
    body = (await res.json()) as T;
  } catch {
    body = {} as T;
  }
  if (!res.ok) {
    throw NeitherMcpApiError.fromResponse(res.status, body);
  }
  return { status: res.status, body };
}
