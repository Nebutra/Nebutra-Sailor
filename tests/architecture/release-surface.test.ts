import { describe, expect, it } from "vitest";

import { getReleaseSurfaceDiagnostics } from "../../scripts/lib/release-surface.mjs";

describe("release surface governance", () => {
  const diagnostics = getReleaseSurfaceDiagnostics();

  it("keeps changesets pointed at packages that still exist", () => {
    expect(diagnostics.missingChangesetPackages).toEqual([]);
  });

  it("does not publish packages with private runtime workspace dependencies", () => {
    expect(diagnostics.privateRuntimeDependencies).toEqual([]);
  });

  it("keeps scoped publishable packages npm/GitHub discoverable", () => {
    expect(diagnostics.requiredMetadataMissing).toEqual([]);
  });
});
