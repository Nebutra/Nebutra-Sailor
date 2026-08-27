import { AI_TOKENS, MemoryProvider, type MeteringProvider, setMetering } from "@nebutra/metering";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadUsageBreakdown } from "../usage-breakdown";

const TENANT = "org_breakdown_test";

describe("loadUsageBreakdown", () => {
  beforeEach(() => {
    setMetering(new MemoryProvider());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty group list for a tenant with no recorded usage", async () => {
    const result = await loadUsageBreakdown(TENANT);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.breakdown.provider).toBe("memory");
    expect(result.breakdown.groups).toEqual([]);
  });

  it("groups ingested AI token usage by every recorded dimension", async () => {
    const provider = new MemoryProvider();
    setMetering(provider);
    await provider.defineMeter(AI_TOKENS);

    await provider.ingest({
      meterId: AI_TOKENS.id,
      tenantId: TENANT,
      value: 300,
      properties: { model: "claude-sonnet", provider: "anthropic", surface: "startup_os" },
    });
    await provider.ingest({
      meterId: AI_TOKENS.id,
      tenantId: TENANT,
      value: 100,
      properties: { model: "gpt-5", provider: "openai", surface: "startup_os" },
    });

    const result = await loadUsageBreakdown(TENANT);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const byModel = result.breakdown.groups.find((group) => group.dimension === "model");
    expect(byModel).toBeDefined();
    expect(byModel?.meterId).toBe(AI_TOKENS.id);
    expect(byModel?.unit).toBe("tokens");
    expect(byModel?.total).toBe(400);
    expect(byModel?.rows.map((row) => [row.label, row.value])).toEqual([
      ["claude-sonnet", 300],
      ["gpt-5", 100],
    ]);
    expect(byModel?.rows[0]?.share).toBeCloseTo(75);

    expect(result.breakdown.groups.map((group) => group.dimension)).toEqual([
      "model",
      "provider",
      "surface",
    ]);
  });

  it("ignores tenants other than the requested one", async () => {
    const provider = new MemoryProvider();
    setMetering(provider);
    await provider.defineMeter(AI_TOKENS);

    await provider.ingest({
      meterId: AI_TOKENS.id,
      tenantId: "org_someone_else",
      value: 999,
      properties: { model: "gpt-5" },
    });

    const result = await loadUsageBreakdown(TENANT);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.breakdown.groups).toEqual([]);
  });

  it("drops dimension values that were recorded as absent", async () => {
    const provider = new MemoryProvider();
    setMetering(provider);
    await provider.defineMeter(AI_TOKENS);

    await provider.ingest({
      meterId: AI_TOKENS.id,
      tenantId: TENANT,
      value: 50,
      properties: { model: "claude-sonnet", provider: null },
    });

    const result = await loadUsageBreakdown(TENANT);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.breakdown.groups.map((group) => group.dimension)).toEqual(["model"]);
  });

  it("reports an error instead of zero usage when the backend fails", async () => {
    const failing = {
      name: "memory",
      defineMeter: vi.fn().mockRejectedValue(new Error("clickhouse unreachable")),
    } as unknown as MeteringProvider;
    setMetering(failing);

    const result = await loadUsageBreakdown(TENANT);

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.message).toContain("metering backend");
  });
});
