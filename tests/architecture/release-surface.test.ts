import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatTrustedPublisherSetup,
  getNpmPublishIdentityDiagnostics,
  listPendingUnscopedPackages,
  npmVersionSupportsTrustedPublishing,
} from "../../scripts/lib/npm-publish-identity.mjs";
import { getReleaseSurfaceDiagnostics } from "../../scripts/lib/release-surface.mjs";

describe("release surface governance", () => {
  const diagnostics = getReleaseSurfaceDiagnostics();

  it("keeps changesets pointed at packages that still exist", () => {
    expect(diagnostics.missingChangesetPackages).toEqual([]);
  });

  it("does not publish packages with private runtime workspace dependencies", () => {
    expect(diagnostics.privateRuntimeDependencies).toEqual([]);
  });

  it("keeps internal workspace dependencies on workspace protocol", () => {
    const workspacePackageNames = new Set(diagnostics.packages.map((entry) => entry.manifest.name));
    const nonWorkspaceDependencies = [];

    for (const entry of diagnostics.packages) {
      for (const field of [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ] as const) {
        for (const [dependencyName, specifier] of Object.entries(entry.manifest[field] ?? {})) {
          if (
            workspacePackageNames.has(dependencyName) &&
            typeof specifier === "string" &&
            !specifier.startsWith("workspace:")
          ) {
            nonWorkspaceDependencies.push(
              `${entry.manifest.name} ${field}.${dependencyName}=${specifier}`,
            );
          }
        }
      }
    }

    expect(nonWorkspaceDependencies).toEqual([]);
  });

  it("keeps scoped publishable packages npm/GitHub discoverable", () => {
    expect(diagnostics.requiredMetadataMissing).toEqual([]);
  });

  it("does not declare runtime entrypoints that package files exclude", () => {
    expect(diagnostics.manifestRuntimeFilesExcludedByFiles).toEqual([]);
  });

  it("publishes registry packages under Apache-2.0", () => {
    const offenders = diagnostics.publishable
      .filter((entry) => entry.manifest.license !== "Apache-2.0")
      .map((entry) => `${entry.manifest.name} (${entry.manifest.license ?? "missing"})`);

    expect(offenders).toEqual([]);
  });

  /**
   * The `license` field is a label; the LICENSE file is the grant. Apache-2.0
   * §4(a) requires a copy of the licence to travel with every redistribution,
   * and npm always includes a LICENSE file in the tarball regardless of the
   * `files` field — so every publishable package must carry one.
   *
   * History: this caught create-sailor shipping the full AGPL-3.0 text while
   * declaring MIT, and 78 packages shipping no licence text at all. Everything
   * moved to Apache-2.0 on 2026-10-16 (ADR 2026-10-16 apache-2-relicense).
   */
  it("ships an Apache-2.0 LICENSE file alongside the Apache-2.0 license field", () => {
    const offenders = diagnostics.publishable
      .map((entry) => {
        const licensePath = join(entry.packageDir, "LICENSE");
        if (!existsSync(licensePath)) return `${entry.manifest.name} (no LICENSE file)`;
        const head = readFileSync(licensePath, "utf-8").slice(0, 300);
        if (!/Apache License\s+Version 2\.0/.test(head)) {
          const firstLine = head.split("\n").find((line) => line.trim().length > 0) ?? "";
          return `${entry.manifest.name} (LICENSE is not Apache-2.0: "${firstLine.trim()}")`;
        }
        return null;
      })
      .filter((offender): offender is string => offender !== null);

    expect(offenders).toEqual([]);
  });

  /**
   * Private apps and packages are not published, but they are distributed in
   * this repository and the Sailor-Template mirror under the root LICENSE. A
   * stale `MIT` / `FSL-1.1-ALv2` label on any of them is a false statement, so
   * every workspace manifest carries the same SPDX id as the root.
   */
  it("labels every workspace manifest, published or private, Apache-2.0", () => {
    const offenders = diagnostics.packages
      .filter((entry) => entry.manifest.license !== "Apache-2.0")
      .map((entry) => `${entry.manifest.name} (${entry.manifest.license ?? "missing"})`);
    const root = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));

    expect(offenders).toEqual([]);
    expect(root.license).toBe("Apache-2.0");
    expect(readFileSync(join(process.cwd(), "LICENSE"), "utf-8")).toMatch(
      /Apache License\s+Version 2\.0, January 2004/,
    );
    expect(existsSync(join(process.cwd(), "NOTICE"))).toBe(true);
    expect(existsSync(join(process.cwd(), "LICENSE-COMMERCIAL.md"))).toBe(false);
  });

  it("gates tags, attestation and the mirror on the combined publish state", () => {
    const workflow = readFileSync(join(process.cwd(), ".github/workflows/release.yml"), "utf-8");
    // The unscoped CLIs publish outside `changeset publish`; a CLI-only
    // release must still tag, attest and mirror.
    expect(workflow).toContain("id: publish_state");
    expect(workflow).toContain("published: ${{ steps.publish_state.outputs.published }}");
    expect(workflow).not.toContain("if: steps.changesets.outputs.published == 'true'");
    expect(workflow).toContain("artifacts/release/unscoped-published.json");
    const script = readFileSync(
      join(process.cwd(), "scripts/publish-unscoped-packages.mjs"),
      "utf-8",
    );
    expect(script).toContain("artifacts/release/unscoped-published.json");
  });

  it("lists every unscoped publishable package for trusted publishing", () => {
    const identity = getNpmPublishIdentityDiagnostics();

    expect(identity.missingFromConfig).toEqual([]);
    expect(identity.extraInConfig).toEqual([]);
    expect(identity.listed).toEqual(["create-sailor", "nebutra"]);
    expect(identity.workflowFile).toBe("release.yml");
    expect(npmVersionSupportsTrustedPublishing("11.5.1")).toBe(true);
    expect(npmVersionSupportsTrustedPublishing("10.9.2")).toBe(false);
    expect(formatTrustedPublisherSetup(identity.identity, "create-sailor")).toContain(
      "Workflow filename: release.yml",
    );
  });

  it("treats a missing registry version as a pending unscoped publish", async () => {
    const fetchImpl = async () =>
      ({
        ok: false,
        status: 404,
        text: async () => "Not found",
      }) as Response;

    const { pending } = await listPendingUnscopedPackages(process.cwd(), fetchImpl);
    expect(pending.map((entry) => entry.name).sort()).toEqual(["create-sailor", "nebutra"]);
  });
});
