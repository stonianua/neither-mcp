import { NEITHER_MCP_SERVER_VERSION } from "./version.js";

export { NEITHER_MCP_SERVER_VERSION };

/** Printed on stderr when NEITHER_API_KEY is missing or whitespace-only. */
export const MISSING_API_KEY_START_URL =
  "https://www.neither.online/start/?product=dev&utm_source=mcp-nokey";

export const MISSING_API_KEY_MESSAGE = [
  "Neither needs an API key.",
  `Get a free key (1 minute, Google sign-in) at ${MISSING_API_KEY_START_URL}`,
  "Then set NEITHER_API_KEY=sk_ctx_... in your MCP client config and restart it.",
].join("\n");

export type NeitherMcpConfig = {
  apiBase: string;
  apiKey: string;
};

export function readNeitherMcpConfig(env: NodeJS.ProcessEnv = process.env): NeitherMcpConfig {
  const apiKey = (env.NEITHER_API_KEY ?? "").trim();
  const apiBase = (env.NEITHER_API_BASE ?? env.NEITHER_API_URL ?? "https://api.neither.online")
    .trim()
    .replace(/\/+$/, "");
  if (!apiKey) {
    throw new Error(MISSING_API_KEY_MESSAGE);
  }
  return { apiBase, apiKey };
}

export async function neitherApiFetch(
  config: NeitherMcpConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${config.apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
      "User-Agent": `neither-mcp-server/${NEITHER_MCP_SERVER_VERSION}`,
      ...(init?.headers ?? {}),
    },
  });
}
