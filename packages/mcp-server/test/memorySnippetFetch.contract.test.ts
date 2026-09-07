import { afterEach, describe, expect, it, vi } from "vitest";
import enriched from "./fixtures/snippet-enriched.json";
import unenriched from "./fixtures/snippet-unenriched.json";
import { runMemorySnippetFetch } from "../src/tools/memorySnippetFetch.js";

const config = { apiBase: "https://api.neither.online", apiKey: "sk_ctx_test" };

describe("memory_snippet_fetch contract (pass-through)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns verbatim Decision/Rejected content when API enrichment is complete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(enriched, { status: 200 }),
      ),
    );

    const out = await runMemorySnippetFetch(config, {
      source_id: enriched.source_id,
      node_id: enriched.node_id,
    });

    expect(out.content).toContain("Decision:");
    expect(out.content).toContain("Rejected:");
    expect(out.content).toMatch(/invite-only signup/i);
    expect(out.content).toMatch(/Stripe Checkout/i);
    expect(out.content_scope).toBe("node_excerpt");
    expect(out.aligned_to).toBe("node");
  });

  it("passes through short summary when API omits Decision/Rejected (enrichment gap)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(unenriched, { status: 200 }),
      ),
    );

    const out = await runMemorySnippetFetch(config, {
      source_id: unenriched.source_id,
      node_id: unenriched.node_id,
    });

    expect(out.content.length).toBeLessThan(250);
    expect(out.content).not.toContain("Decision:");
    expect(out.content).not.toContain("Rejected:");
    expect(out.content).not.toMatch(/invite-only signup/i);
  });

  it("forwards node_id query param to the API", async () => {
    const fetchMock = vi.fn(async () => Response.json(enriched, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await runMemorySnippetFetch(config, {
      source_id: "src_harbor_signup_adr",
      node_id: "node_harbor_invite_001",
    });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/memory/snippet/src_harbor_signup_adr");
    expect(calledUrl).toContain("node_id=node_harbor_invite_001");
  });
});
