import { NEITHER_MCP_SERVER_VERSION } from "./version.js";

export { NEITHER_MCP_SERVER_VERSION };

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
    throw new Error(
      "NEITHER_API_KEY is required (sk_ctx_* bearer token with memory_read capability)",
    );
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
