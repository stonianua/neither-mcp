import { describe, expect, it } from "vitest";
import enriched from "./fixtures/search-hit-enriched.json";
import unenriched from "./fixtures/search-hit-unenriched.json";
import { formatMemorySearchResponse } from "../src/tools/memorySearch.js";

describe("memory_search contract (formatMemorySearchResponse)", () => {
  it("preserves Decision and Rejected in raw results when API returns enriched fields", () => {
    const out = formatMemorySearchResponse({
      query: enriched.query,
      results: enriched.results,
    });

    const hit = out.results[0];
    expect(hit.decision).toContain("invite-only signup");
    expect(hit.rejected).toContain("Stripe Checkout");
    expect(hit.decision).not.toBe(hit.title);
    expect(hit.rejected).not.toBeNull();
  });

  it("renders Decision/Rejected prose when API returns enriched fields", () => {
    const out = formatMemorySearchResponse({
      query: enriched.query,
      results: enriched.results,
    });

    expect(out.formatted).toContain("Decision: Harbor uses invite-only signup");
    expect(out.formatted).toContain("Rejected: Open signup with Stripe Checkout");
    expect(out.formatted).toContain("invite codes");
  });

  it("documents enrichment gap: decision mirrors title and rejected is null", () => {
    const out = formatMemorySearchResponse({
      query: unenriched.query,
      results: unenriched.results,
    });

    const hit = out.results[0];
    expect(hit.decision).toBe(hit.title);
    expect(hit.rejected).toBeNull();
    expect(out.formatted).not.toContain("Rejected:");
    expect(out.formatted).not.toMatch(/invite-only signup/i);
  });
});
