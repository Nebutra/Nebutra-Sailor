import { describe, expect, it } from "vitest";

import {
  getPackageMaturityDiagnostics,
  isReleaseGraph,
  PACKAGE_GRAPHS,
  PACKAGE_STATUSES,
} from "../../scripts/lib/package-maturity.mjs";

describe("package maturity and release graph", () => {
  const diagnostics = getPackageMaturityDiagnostics();

  it("declares status and graph on every workspace package", () => {
    expect(diagnostics.undeclaredStatus).toEqual([]);
    expect(diagnostics.undeclaredGraph).toEqual([]);
    expect(diagnostics.packages.length).toBeGreaterThan(0);

    for (const item of diagnostics.packages) {
      expect(PACKAGE_STATUSES, item.name).toContain(item.status);
      expect(PACKAGE_GRAPHS, item.name).toContain(item.graph);
    }
  });

  it("keeps labs out of the release graph", () => {
    const release = diagnostics.packages.filter((item) => isReleaseGraph(item.graph));
    const labs = diagnostics.byGraph.labs;

    expect(labs.length).toBeGreaterThan(0);
    expect(release.some((item) => item.graph === "labs")).toBe(false);
    const overlap = release.filter((item) => labs.some((lab) => lab.name === item.name));
    expect(overlap).toEqual([]);
  });

  it("does not invent new stable packages", () => {
    const stable = diagnostics.byStatus.stable.map((item) => item.name).sort();
    expect(stable).toEqual([
      "@nebutra/ai-providers",
      "@nebutra/notifications",
      "@nebutra/webhooks",
    ]);
  });
});
