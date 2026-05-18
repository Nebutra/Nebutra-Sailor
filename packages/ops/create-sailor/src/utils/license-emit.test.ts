import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  emitIndependentLicense,
  verifyScaffoldMeta,
  verifyScaffoldMetaDetailed,
} from "./license-emit";

const TEMPLATE_FIXTURE = `# Nebutra-Sailor Independent Developer License

Free for individuals.
`;

function setupTempProject(): { dir: string; templatesRoot: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-license-"));
  const templatesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-templates-"));
  fs.writeFileSync(path.join(templatesRoot, "LICENSE-INDEPENDENT.md"), TEMPLATE_FIXTURE);
  return { dir, templatesRoot };
}

describe("emitIndependentLicense", () => {
  let dir: string;
  let templatesRoot: string;

  beforeEach(() => {
    const setup = setupTempProject();
    dir = setup.dir;
    templatesRoot = setup.templatesRoot;
  });

  it("writes LICENSE with the Independent template body", () => {
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    expect(fs.readFileSync(path.join(dir, "LICENSE"), "utf-8")).toBe(TEMPLATE_FIXTURE);
  });

  it("preserves an upstream AGPL LICENSE as LICENSE-AGPL-REFERENCE.md", () => {
    fs.writeFileSync(
      path.join(dir, "LICENSE"),
      "GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, ...",
    );
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    expect(fs.existsSync(path.join(dir, "LICENSE-AGPL-REFERENCE.md"))).toBe(true);
    expect(fs.readFileSync(path.join(dir, "LICENSE-AGPL-REFERENCE.md"), "utf-8")).toMatch(
      /GNU AFFERO/,
    );
    expect(fs.readFileSync(path.join(dir, "LICENSE"), "utf-8")).toBe(TEMPLATE_FIXTURE);
  });

  it("does NOT touch a non-AGPL LICENSE (e.g. user already replaced)", () => {
    fs.writeFileSync(path.join(dir, "LICENSE"), "MIT License\nCopyright (c)...");
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    expect(fs.existsSync(path.join(dir, "LICENSE-AGPL-REFERENCE.md"))).toBe(false);
    // LICENSE is overwritten with Independent text — that's the point.
    expect(fs.readFileSync(path.join(dir, "LICENSE"), "utf-8")).toBe(TEMPLATE_FIXTURE);
  });

  it("writes a signed scaffold marker that verifyScaffoldMeta accepts", () => {
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const metaPath = path.join(dir, ".nebutra", "scaffold-meta.json");
    expect(fs.existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    expect(meta.schemaVersion).toBe(1);
    expect(meta.projectName).toBe("demo");
    expect(meta.cliVersion).toBe("1.7.0");
    expect(meta.license.tier).toBe("independent");
    expect(typeof meta.signature).toBe("string");
    expect(meta.signature).toHaveLength(64); // sha256 hex
    expect(verifyScaffoldMeta(meta)).toBe(true);
  });

  it("verifyScaffoldMeta rejects tampered markers", () => {
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const metaPath = path.join(dir, ".nebutra", "scaffold-meta.json");
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    meta.projectName = "hijacked";
    expect(verifyScaffoldMeta(meta)).toBe(false);
    expect(verifyScaffoldMetaDetailed(meta).reason).toBe("signature_mismatch");
  });

  it("records the current signingKeyId (Phase 2)", () => {
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.1",
      templatesRoot,
    });
    const meta = JSON.parse(
      fs.readFileSync(path.join(dir, ".nebutra", "scaffold-meta.json"), "utf-8"),
    );
    expect(meta.signingKeyId).toBe("v1");
  });

  it("Phase 1 back-compat: verifies markers WITHOUT a signingKeyId field", () => {
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const metaPath = path.join(dir, ".nebutra", "scaffold-meta.json");
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    // Simulate a Phase 1 marker (no signingKeyId) — verifier must fall back to v1.
    delete meta.signingKeyId;
    expect(verifyScaffoldMeta(meta)).toBe(true);
    expect(verifyScaffoldMetaDetailed(meta).reason).toBe("ok");
  });

  it("rejects markers signed with an unknown keyId", () => {
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const metaPath = path.join(dir, ".nebutra", "scaffold-meta.json");
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    meta.signingKeyId = "v-future-rotated";
    expect(verifyScaffoldMetaDetailed(meta).reason).toBe("unknown_signing_key");
  });

  it("prepends a license notice to README.md when one exists", () => {
    fs.writeFileSync(path.join(dir, "README.md"), "# demo\n\nhello\n");
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const readme = fs.readFileSync(path.join(dir, "README.md"), "utf-8");
    expect(readme).toMatch(/Nebutra-Sailor Independent Developer License/);
    expect(readme).toMatch(/# demo/);
  });

  it("is idempotent on the README notice (re-running doesn't double-prepend)", () => {
    fs.writeFileSync(path.join(dir, "README.md"), "# demo\n");
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const after1 = fs.readFileSync(path.join(dir, "README.md"), "utf-8");
    emitIndependentLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const after2 = fs.readFileSync(path.join(dir, "README.md"), "utf-8");
    const occurrences = (after2.match(/Nebutra-Sailor Independent Developer License/g) ?? [])
      .length;
    expect(occurrences).toBe(1);
    expect(after2).toBe(after1);
  });
});
