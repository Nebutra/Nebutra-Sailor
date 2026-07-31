import { describe, expect, it } from "vitest";
import { invokeTool } from "../invoke";
import { ForgeRegistry } from "../registry";

describe("F0 residue tools (Track B)", () => {
  const registry = ForgeRegistry.openDefault();

  it("registers world-clock and js-format", () => {
    expect(registry.has("time/world-clock")).toBe(true);
    expect(registry.has("dev/js-format")).toBe(true);
  });

  it("world-clock returns multi-zone times", async () => {
    const r = await invokeTool(registry, {
      toolId: "time/world-clock",
      input: {
        timezones: ["UTC", "Asia/Shanghai"],
        at: "2026-01-01T00:00:00.000Z",
        format: "YYYY-MM-DD HH:mm",
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.output as {
      clocks: Array<{ timezone: string; time: string | null }>;
    };
    expect(out.clocks).toHaveLength(2);
    expect(out.clocks[0]?.timezone).toBe("UTC");
    expect(out.clocks[0]?.time).toContain("2026-01-01");
    expect(out.clocks[1]?.timezone).toBe("Asia/Shanghai");
    // Shanghai is UTC+8
    expect(out.clocks[1]?.time).toContain("2026-01-01 08:00");
  });

  it("js-format pretty-prints JS via prettier", async () => {
    const r = await invokeTool(registry, {
      toolId: "dev/js-format",
      input: {
        text: "const x={a:1,b:2}",
        parser: "babel",
        semi: true,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.output as { result: string; engine: string };
    expect(out.engine).toBe("prettier");
    expect(out.result).toContain("const x");
    expect(out.result).toMatch(/a:\s*1/);
  });

  it("js-format rejects oversize input via schema", async () => {
    const huge = "x".repeat(200_001);
    const r = await invokeTool(registry, {
      toolId: "dev/js-format",
      input: { text: huge },
    });
    expect(r.ok).toBe(false);
  });
});
