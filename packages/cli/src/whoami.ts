import { formatWhoamiQuotaLines, parseWorkspaceQuotas, tierHumanLabel } from "./quotaDisplay.js";
import { NEITHER_CLI_VERSION, readNeitherCliConfig, type NeitherCliConfig } from "./push.js";

export type WhoamiResult =
  | { ok: true; status: number; body: Record<string, unknown> }
  | { ok: false; offline: true; message: string };

function isOfflineError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return (
    e.name === "TypeError" ||
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("network")
  );
}

export async function fetchWhoami(
  config: NeitherCliConfig,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${config.apiBase}/api/context/workspace`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
      "User-Agent": `neither-cli/${NEITHER_CLI_VERSION}`,
    },
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : `whoami failed (HTTP ${res.status})`,
    );
  }
  return { status: res.status, body };
}

export async function runWhoami(opts?: {
  json?: boolean;
  config?: NeitherCliConfig;
}): Promise<WhoamiResult> {
  let config: NeitherCliConfig;
  try {
    config = opts?.config ?? readNeitherCliConfig();
  } catch (e) {
    return {
      ok: false,
      offline: true,
      message: e instanceof Error ? e.message : String(e),
    };
  }

  try {
    const { status, body } = await fetchWhoami(config);
    if (opts?.json) {
      process.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
    } else {
      const ws = typeof body.workspace_id === "string" ? body.workspace_id : "?";
      const bc =
        typeof body.business_context_id === "string" ? body.business_context_id : "workspace-wide";
      process.stdout.write(`[neither whoami] workspace=${ws} bc=${bc} (HTTP ${status})\n`);
      const { developer_tier, quotas } = parseWorkspaceQuotas(body);
      if (developer_tier) {
        process.stdout.write(`plan: ${tierHumanLabel(developer_tier)}\n`);
      }
      if (quotas) {
        for (const line of formatWhoamiQuotaLines(quotas)) {
          process.stdout.write(`  ${line}\n`);
        }
      }
    }
    return { ok: true, status, body };
  } catch (e) {
    if (isOfflineError(e)) {
      return {
        ok: false,
        offline: true,
        message: e instanceof Error ? e.message : String(e),
      };
    }
    throw e;
  }
}
