import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NEITHER_CLI_VERSION } from "./push.js";

export const NEITHER_CONFIG_DIR = ".neither";
export const NEITHER_CONFIG_FILENAME = "config.json";

export type NeitherConfigFile = {
  apiBase: string;
  version: string;
  createdAt: string;
};

export function neitherConfigPath(cwd = process.cwd()): string {
  return path.join(cwd, NEITHER_CONFIG_DIR, NEITHER_CONFIG_FILENAME);
}

export async function runInit(cwd = process.cwd()): Promise<{ ok: true; configPath: string }> {
  const dir = path.join(cwd, NEITHER_CONFIG_DIR);
  await mkdir(dir, { recursive: true });
  const configPath = neitherConfigPath(cwd);
  const payload: NeitherConfigFile = {
    apiBase: "https://api.neither.online",
    version: NEITHER_CLI_VERSION,
    createdAt: new Date().toISOString(),
  };
  await writeFile(configPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { ok: true, configPath };
}
