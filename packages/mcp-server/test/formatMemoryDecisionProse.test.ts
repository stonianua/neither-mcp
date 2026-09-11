import { describe, expect, it } from "vitest";
import { formatMemoryDecisionProse } from "../src/lib/formatMemoryDecisionProse.js";

describe("formatMemoryDecisionProse", () => {
  it("includes Decision and Rejected when provided by API", () => {
    const prose = formatMemoryDecisionProse(
      [
        {
          title: "Harbor signup: invite codes over open registration",
          decision: "Harbor uses invite-only signup with single-use invite codes.",
          rejected: "Stripe Checkout open signup was rejected for launch.",
          constraint: "Ship Q1 with two support engineers max.",
          excerpt: "Harbor uses invite-only signup with single-use invite codes.",
        },
      ],
      "docs/adr-signup.md",
    );

    expect(prose).toContain("Decision: Harbor uses invite-only signup");
    expect(prose).toContain("Rejected: Stripe Checkout open signup");
    expect(prose).toContain("Constraint: Ship Q1");
    expect(prose).toContain("Citation:");
  });

  it("falls back to title for Decision line only when decision field is absent", () => {
    const prose = formatMemoryDecisionProse(
      [{ title: "Harbor signup: invite codes over open registration" }],
      "search:test",
    );

    expect(prose).toContain("Decision: Harbor signup: invite codes over open registration");
    expect(prose).not.toContain("Rejected:");
  });
});
