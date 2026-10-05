import { describe, expect, it } from "vitest";
import {
  MISSING_API_KEY_MESSAGE,
  MISSING_API_KEY_START_URL,
  readNeitherCliConfig,
} from "../src/push.js";

describe("readNeitherCliConfig missing API key", () => {
  it("throws the start URL help for a missing key", () => {
    const env = { ...process.env };
    delete env.NEITHER_API_KEY;
    expect(() => readNeitherCliConfig(env)).toThrow(MISSING_API_KEY_MESSAGE);
    expect(MISSING_API_KEY_MESSAGE).toContain(MISSING_API_KEY_START_URL);
    expect(MISSING_API_KEY_START_URL).toBe(
      "https://www.neither.online/start/?product=dev&utm_source=cli-nokey",
    );
  });

  it("throws the same help for whitespace-only keys", () => {
    expect(() => readNeitherCliConfig({ NEITHER_API_KEY: "" })).toThrow(MISSING_API_KEY_MESSAGE);
    expect(() => readNeitherCliConfig({ NEITHER_API_KEY: "   " })).toThrow(MISSING_API_KEY_MESSAGE);
    expect(() => readNeitherCliConfig({ NEITHER_API_KEY: "\t\n" })).toThrow(MISSING_API_KEY_MESSAGE);
  });

  it("accepts a trimmed non-empty key", () => {
    expect(readNeitherCliConfig({ NEITHER_API_KEY: " sk_ctx_test " })).toEqual({
      apiBase: "https://api.neither.online",
      apiKey: "sk_ctx_test",
    });
  });
});
