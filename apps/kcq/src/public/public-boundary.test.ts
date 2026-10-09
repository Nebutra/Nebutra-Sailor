import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM build helper without types.
import { findPublicLeaks } from "../../scripts/public-boundary.mjs";

const chunk = (fileName: string, moduleIds: string[], extra: Partial<Record<string, unknown>> = {}) => ({
  fileName,
  moduleIds,
  imports: [],
  dynamicImports: [],
  facadeModuleId: moduleIds[0],
  ...extra,
});
const CORE = "/kcq/packages/core/src/controllers/chart/impl/createChartController.ts";

describe("public bundle boundary", () => {
  it("admits the chart core only behind the hero's allowlisted dynamic import", () => {
    const hero = chunk("live-chart.js", ["/app/src/public/home/hero/live-chart.ts"], { imports: ["core.js"] });
    const core = chunk("core.js", [CORE]);
    const entry = chunk("public.js", ["/app/public.html"], { dynamicImports: ["live-chart.js"] });
    expect(findPublicLeaks([entry, hero, core], entry)).toEqual([]);
  });

  it("fails when the same core chunk is also reachable statically", () => {
    const hero = chunk("live-chart.js", ["/app/src/public/home/hero/live-chart.ts"], { imports: ["core.js"] });
    const core = chunk("core.js", [CORE]);
    const entry = chunk("public.js", ["/app/public.html"], { imports: ["core.js"], dynamicImports: ["live-chart.js"] });
    expect(findPublicLeaks([entry, hero, core], entry)).toEqual([{ chunk: "core.js", modules: [CORE] }]);
  });

  it("never lets the hero chunk pull in auth, the Vue chart package or the Agent runtime", () => {
    const vue = "/kcq/packages/vue/src/components/KLineChart.vue";
    const hero = chunk("live-chart.js", ["/app/src/public/home/hero/live-chart.ts", vue]);
    const entry = chunk("public.js", ["/app/public.html"], { dynamicImports: ["live-chart.js"] });
    expect(findPublicLeaks([entry, hero], entry)).toEqual([{ chunk: "live-chart.js", modules: [vue] }]);
  });

  it("does not extend the exception to other lazy chunks", () => {
    const other = chunk("other.js", ["/app/src/public/home/other.ts", CORE]);
    const entry = chunk("public.js", ["/app/public.html"], { dynamicImports: ["other.js"] });
    expect(findPublicLeaks([entry, other], entry)).toHaveLength(1);
  });
});
