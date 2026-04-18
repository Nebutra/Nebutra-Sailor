import {
  AI_TOKENS,
  API_CALLS,
  closeMetering,
  MemoryProvider,
  setMetering,
} from "@nebutra/metering";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkEntitlementUsage } from "../entitlements/service";
import { getUsage } from "../usage/service";

// =============================================================================
// billing <-> metering integration
// =============================================================================
// These tests exercise the live wire from `packages/metering` through to
// `packages/billing/entitlements`. They use an in-memory metering provider so
// they stay fast and hermetic — no ClickHouse / database required.
// =============================================================================

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

describe("billing <-> metering integration", () => {
  let provider: MemoryProvider;

  beforeEach(async () => {
    provider = new MemoryProvider();
    await provider.defineMeter(AI_TOKENS);
    await provider.defineMeter(API_CALLS);
    setMetering(provider);
  });

  afterEach(async () => {
    await closeMetering();
  });

  // ── getUsage ─────────────────────────────────────────────────────────────

  describe("getUsage", () => {
    it("returns 0 when no events recorded", async () => {
      const usage = await getUsage("org_1", "ai_tokens", { period: "monthly" });
      expect(usage).toBe(0);
    });

    it("reflects recorded events", async () => {
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 100 });
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 50 });

      const usage = await getUsage("org_1", "ai_tokens", { period: "monthly" });
      expect(usage).toBe(150);
    });

    it("is tenant-scoped", async () => {
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 100 });
      await provider.ingest({ tenantId: "org_2", meterId: "ai_tokens", value: 999 });

      expect(await getUsage("org_1", "ai_tokens", { period: "monthly" })).toBe(100);
      expect(await getUsage("org_2", "ai_tokens", { period: "monthly" })).toBe(999);
    });

    it("is meter-scoped", async () => {
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 100 });
      await provider.ingest({ tenantId: "org_1", meterId: "api_calls", value: 5 });

      expect(await getUsage("org_1", "ai_tokens", { period: "monthly" })).toBe(100);
      expect(await getUsage("org_1", "api_calls", { period: "monthly" })).toBe(5);
    });

    it("excludes events outside the current month", async () => {
      await provider.ingest({
        tenantId: "org_1",
        meterId: "ai_tokens",
        value: 500,
        timestamp: daysAgo(60),
      });
      await provider.ingest({
        tenantId: "org_1",
        meterId: "ai_tokens",
        value: 100,
      });

      const usage = await getUsage("org_1", "ai_tokens", { period: "monthly" });
      expect(usage).toBe(100);
    });
  });

  // ── checkEntitlementUsage ────────────────────────────────────────────────

  describe("checkEntitlementUsage (plan-limit + live usage)", () => {
    it("blocks when usage exceeds FREE plan limit", async () => {
      // FREE plan: 10_000 ai_tokens per month
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 10_001 });

      const result = await checkEntitlementUsage("org_1", "ai_tokens", "FREE");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("limit exceeded");
      expect(result.used).toBe(10_001);
      expect(result.limit).toBe(10_000);
    });

    it("allows when usage is under FREE plan limit", async () => {
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 500 });

      const result = await checkEntitlementUsage("org_1", "ai_tokens", "FREE");
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(500);
      expect(result.limit).toBe(10_000);
    });

    it("allows higher usage on PRO than FREE", async () => {
      // FREE limit is 10_000; PRO is 500_000
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 50_000 });

      const pro = await checkEntitlementUsage("org_1", "ai_tokens", "PRO");
      expect(pro.allowed).toBe(true);
      expect(pro.used).toBe(50_000);
      expect(pro.limit).toBe(500_000);
    });

    it("treats ENTERPRISE as unlimited (-1)", async () => {
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 9_999_999 });

      const result = await checkEntitlementUsage("org_1", "ai_tokens", "ENTERPRISE");
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(9_999_999);
      // unlimited encoded as -1
      expect(result.limit).toBe(-1);
    });

    it("ignores usage recorded in previous months (billing cycle)", async () => {
      // last month: 9_000 tokens; current month: 100 tokens. Limit is 10_000.
      await provider.ingest({
        tenantId: "org_1",
        meterId: "ai_tokens",
        value: 9_000,
        timestamp: daysAgo(60),
      });
      await provider.ingest({
        tenantId: "org_1",
        meterId: "ai_tokens",
        value: 100,
      });

      const result = await checkEntitlementUsage("org_1", "ai_tokens", "FREE");
      expect(result.used).toBe(100);
      expect(result.allowed).toBe(true);
    });

    it("is tenant-scoped (one tenant over limit does not affect another)", async () => {
      await provider.ingest({ tenantId: "org_1", meterId: "ai_tokens", value: 10_001 });
      await provider.ingest({ tenantId: "org_2", meterId: "ai_tokens", value: 10 });

      const blocked = await checkEntitlementUsage("org_1", "ai_tokens", "FREE");
      const allowed = await checkEntitlementUsage("org_2", "ai_tokens", "FREE");

      expect(blocked.allowed).toBe(false);
      expect(allowed.allowed).toBe(true);
    });
  });
});
