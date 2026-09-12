import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { assertToolsMeetAnthropicReview, TOOLS } from "../src/toolDefinitions.js";

const EXPECTED_NAMES = [
  "memory_search",
  "memory_for_file",
  "memory_snippet_fetch",
  "memory_timeline",
  "memory_push",
] as const;

describe("Anthropic review tool annotations", () => {
  it("declares title plus readOnlyHint or destructiveHint on every tool", () => {
    expect(TOOLS.map((t) => t.name)).toEqual([...EXPECTED_NAMES]);
    expect(() => assertToolsMeetAnthropicReview(TOOLS)).not.toThrow();

    for (const tool of TOOLS) {
      expect(tool.title, `${tool.name} top-level title`).toBeTruthy();
      expect(tool.annotations?.title, `${tool.name} annotations.title`).toBe(tool.title);
      const readOnly = tool.annotations?.readOnlyHint;
      const destructive = tool.annotations?.destructiveHint;
      expect(
        readOnly === true || destructive === true || destructive === false,
        `${tool.name} needs readOnlyHint or destructiveHint`,
      ).toBe(true);
    }

    const write = TOOLS.find((t) => t.name === "memory_push");
    expect(write?.annotations?.readOnlyHint).toBe(false);
    expect(write?.annotations?.destructiveHint).toBe(false);

    for (const name of EXPECTED_NAMES.filter((n) => n !== "memory_push")) {
      const tool = TOOLS.find((t) => t.name === name);
      expect(tool?.annotations?.readOnlyHint, name).toBe(true);
    }
  });
});

describe("stdio tools/list", () => {
  const distIndex = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/index.js");
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;

  afterAll(async () => {
    await client?.close().catch(() => undefined);
    await transport?.close().catch(() => undefined);
  });

  it("returns the same annotated tools over stdio", async () => {
    if (!existsSync(distIndex)) {
      throw new Error("dist/index.js missing; run npm run build before this test");
    }

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [distIndex],
      env: {
        ...process.env,
        NEITHER_API_KEY: "placeholder",
        NEITHER_API_BASE: "https://api.neither.online",
      },
    });
    client = new Client({ name: "neither-mcp-annotation-test", version: "0.0.0" });
    await client.connect(transport);
    const listed = await client.listTools();
    expect(() => assertToolsMeetAnthropicReview(listed.tools)).not.toThrow();
    expect(listed.tools.map((t) => t.name)).toEqual([...EXPECTED_NAMES]);
    for (const tool of listed.tools) {
      expect(tool.title ?? tool.annotations?.title).toBeTruthy();
      expect(
        tool.annotations?.readOnlyHint === true ||
          tool.annotations?.destructiveHint === true ||
          tool.annotations?.destructiveHint === false,
      ).toBe(true);
    }
  });
});
