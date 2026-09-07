import { afterEach, describe, expect, it, vi } from "vitest";
import { runMemoryPush } from "../src/tools/memoryPush.js";

const config = { apiBase: "https://api.neither.online", apiKey: "sk_ctx_test" };

const PUSH_MARKDOWN = `# Harbor signup ADR

Decision: Harbor uses invite-only signup with single-use invite codes to control early access volume and support load.

Rejected: Open signup with Stripe Checkout self-serve billing was rejected for launch due to fraud risk and incomplete billing ops.
`;

describe("memory_push contract (pass-through)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs content unchanged to /api/memory/push", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.content).toBe(PUSH_MARKDOWN.trim());
      return Response.json(
        {
          snippet_id: "snip_1",
          source_id: "src_1",
          job_id: "job_1",
          mode: "async",
          status_url: "https://api.neither.online/api/jobs/job_1",
          enrichment: "pending",
          metadata: {
            occurred_at: null,
            bc_id: null,
            participants: [],
            thread_id: null,
          },
        },
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await runMemoryPush(config, { content: PUSH_MARKDOWN });

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toBe("https://api.neither.online/api/memory/push");
    expect(out.enrichment).toBe("pending");
    expect(out.source_id).toBe("src_1");
    expect(out.formatted).toContain("enrichment: pending");
  });
});
