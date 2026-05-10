import { describe, expect, it } from "vitest";
import { evaluateUsageLimit } from "./quota-enforcement";

describe("evaluateUsageLimit", () => {
  it("blocks when current usage has already reached a finite billing limit", () => {
    const result = evaluateUsageLimit({
      meterId: "ai_tokens",
      used: 10_000,
      limit: 10_000,
    });

    expect(result).toEqual({
      allowed: false,
      meterId: "ai_tokens",
      used: 10_000,
      requested: 0,
      projected: 10_000,
      limit: 10_000,
      remaining: 0,
      reason: "ai_tokens limit exceeded (10000/10000)",
    });
  });

  it("allows billing-style unlimited limits encoded as -1", () => {
    const result = evaluateUsageLimit({
      meterId: "ai_tokens",
      used: 9_999_999,
      requested: 50_000,
      limit: -1,
    });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
    expect(result.remaining).toBe(Number.POSITIVE_INFINITY);
    expect(result.projected).toBe(10_049_999);
  });

  it("accounts for requested usage before allowing an operation", () => {
    const result = evaluateUsageLimit({
      meterId: "api_calls",
      used: 90,
      requested: 11,
      limit: 100,
    });

    expect(result.allowed).toBe(false);
    expect(result.projected).toBe(101);
    expect(result.remaining).toBe(10);
    expect(result.reason).toBe("api_calls limit exceeded (101/100)");
  });
});
