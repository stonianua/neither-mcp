import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MISSING_API_KEY_MESSAGE,
  MISSING_API_KEY_START_URL,
  readNeitherMcpConfig,
} from "../src/config.js";

const distIndex = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/index.js");

function spawnBuiltServer(
  apiKey: string | undefined,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (apiKey === undefined) {
    delete env.NEITHER_API_KEY;
  } else {
    env.NEITHER_API_KEY = apiKey;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [distIndex], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("timed out waiting for missing-key exit"));
    }, 5000);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

describe("readNeitherMcpConfig missing API key", () => {
  it("throws the start URL help for a missing key", () => {
    const env = { ...process.env };
    delete env.NEITHER_API_KEY;
    expect(() => readNeitherMcpConfig(env)).toThrow(MISSING_API_KEY_MESSAGE);
    expect(MISSING_API_KEY_MESSAGE).toContain(MISSING_API_KEY_START_URL);
    expect(MISSING_API_KEY_START_URL).toBe(
      "https://www.neither.online/start/?product=dev&utm_source=mcp-nokey",
    );
  });

  it("throws the same help for whitespace-only keys", () => {
    expect(() => readNeitherMcpConfig({ NEITHER_API_KEY: "" })).toThrow(MISSING_API_KEY_MESSAGE);
    expect(() => readNeitherMcpConfig({ NEITHER_API_KEY: "   " })).toThrow(MISSING_API_KEY_MESSAGE);
    expect(() => readNeitherMcpConfig({ NEITHER_API_KEY: "\t\n" })).toThrow(MISSING_API_KEY_MESSAGE);
  });

  it("accepts a trimmed non-empty key", () => {
    expect(readNeitherMcpConfig({ NEITHER_API_KEY: " sk_ctx_test " })).toEqual({
      apiBase: "https://api.neither.online",
      apiKey: "sk_ctx_test",
    });
  });
});

describe("built stdio server missing API key", () => {
  it("prints the help on stderr, leaves stdout empty, and exits 1 when the key is missing", async () => {
    if (!existsSync(distIndex)) {
      throw new Error("dist/index.js missing; run npm run build before this test");
    }
    const { code, stdout, stderr } = await spawnBuiltServer(undefined);
    expect(code).toBe(1);
    expect(stdout).toBe("");
    expect(stderr.trim()).toBe(MISSING_API_KEY_MESSAGE);
  });

  it("prints the help on stderr and exits 1 for a whitespace-only key", async () => {
    if (!existsSync(distIndex)) {
      throw new Error("dist/index.js missing; run npm run build before this test");
    }
    const { code, stdout, stderr } = await spawnBuiltServer("  \t  ");
    expect(code).toBe(1);
    expect(stdout).toBe("");
    expect(stderr.trim()).toBe(MISSING_API_KEY_MESSAGE);
  });
});
