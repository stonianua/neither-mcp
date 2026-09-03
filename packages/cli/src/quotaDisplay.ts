export type DeveloperTier = "free_beta" | "paid_override";

export type QuotaMeter = {
  used: number;
  limit: number | null;
  remaining?: number | null;
  resets_at?: string | null;
};

export type WorkspaceQuotas = {
  stored_bytes: QuotaMeter;
  memory_reads_today: QuotaMeter;
  business_contexts: QuotaMeter;
  workspaces: QuotaMeter;
  history_depth_days: number | null;
};

export function tierHumanLabel(tier: DeveloperTier): string {
  if (tier === "free_beta") return "Free beta";
  if (tier === "paid_override") return "Paid";
  return "Plan";
}

export function formatMegabytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 MB";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatQuotaFraction(
  used: number,
  limit: number | null,
  formatValue?: (n: number) => string,
): string {
  const fmt = formatValue ?? ((n: number) => String(n));
  if (limit === null) return `${fmt(used)} · Unlimited`;
  const remaining =
    Number.isFinite(used) && Number.isFinite(limit) ? Math.max(0, limit - used) : null;
  const base = `${fmt(used)} / ${fmt(limit)}`;
  if (remaining === null) return base;
  const leftFmt = formatValue ? formatValue(remaining) : String(remaining);
  return `${base} (${leftFmt} left)`;
}

export function historyHumanLabel(days: number | null): string {
  if (days === null) return "Unlimited";
  if (days === 3) return "~3-day snapshot";
  return `~${days} days`;
}

export function parseWorkspaceQuotas(body: Record<string, unknown>): {
  developer_tier: DeveloperTier | null;
  quotas: WorkspaceQuotas | null;
} {
  const tierRaw = body.developer_tier;
  const developer_tier = tierRaw === "free_beta" || tierRaw === "paid_override" ? tierRaw : null;
  const quotasRaw = body.quotas;
  if (quotasRaw == null || typeof quotasRaw !== "object") {
    return { developer_tier, quotas: null };
  }
  const q = quotasRaw as Record<string, unknown>;
  const meter = (key: string): QuotaMeter | null => {
    const m = q[key];
    if (m == null || typeof m !== "object") return null;
    const o = m as Record<string, unknown>;
    const used = typeof o.used === "number" ? o.used : 0;
    const limit = typeof o.limit === "number" ? o.limit : o.limit === null ? null : null;
    const remaining = typeof o.remaining === "number" ? o.remaining : undefined;
    const resets_at = typeof o.resets_at === "string" ? o.resets_at : undefined;
    return { used, limit, remaining, resets_at };
  };
  const stored_bytes = meter("stored_bytes");
  const memory_reads_today = meter("memory_reads_today");
  const business_contexts = meter("business_contexts");
  const workspaces = meter("workspaces");
  if (!stored_bytes || !memory_reads_today || !business_contexts || !workspaces) {
    return { developer_tier, quotas: null };
  }
  const history_depth_days =
    typeof q.history_depth_days === "number"
      ? q.history_depth_days
      : q.history_depth_days === null
        ? null
        : null;
  return {
    developer_tier,
    quotas: {
      stored_bytes,
      memory_reads_today,
      business_contexts,
      workspaces,
      history_depth_days,
    },
  };
}

export function formatWhoamiQuotaLines(quotas: WorkspaceQuotas): string[] {
  return [
    `storage: ${formatQuotaFraction(quotas.stored_bytes.used, quotas.stored_bytes.limit, formatMegabytes)}`,
    `memory reads today: ${formatQuotaFraction(
      quotas.memory_reads_today.used,
      quotas.memory_reads_today.limit,
    )}`,
    `business contexts: ${formatQuotaFraction(
      quotas.business_contexts.used,
      quotas.business_contexts.limit,
    )}`,
    `workspaces: ${formatQuotaFraction(quotas.workspaces.used, quotas.workspaces.limit)}`,
    `history: ${historyHumanLabel(quotas.history_depth_days)}`,
  ];
}

export type QuotaExceededBody = {
  error: "quota_exceeded";
  quota?: string;
  tier?: string;
  limit?: number;
  used?: number;
  requested?: number;
  remaining?: number;
  message?: string;
};

export function isQuotaExceededBody(body: unknown): body is QuotaExceededBody {
  return (
    body !== null &&
    typeof body === "object" &&
    (body as QuotaExceededBody).error === "quota_exceeded"
  );
}

export function formatQuotaExceededMessage(body: QuotaExceededBody): string {
  const quota = typeof body.quota === "string" ? body.quota : "quota";
  const used = typeof body.used === "number" ? body.used : null;
  const limit = typeof body.limit === "number" ? body.limit : null;
  if (quota === "stored_bytes" && used !== null && limit !== null) {
    return `Free beta limit reached for storage. Used ${formatMegabytes(used)} of ${formatMegabytes(limit)}.`;
  }
  if (used !== null && limit !== null) {
    return `Free beta limit reached for ${quota.replace(/_/g, " ")}. Used ${used} of ${limit}.`;
  }
  return typeof body.message === "string" && body.message.trim() ? body.message : "quota_exceeded";
}
