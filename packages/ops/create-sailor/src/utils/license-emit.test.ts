import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  emitScaffoldLicense,
  verifyScaffoldMeta,
  verifyScaffoldMetaDetailed,
} from "./license-emit";

const TEMPLATE_FIXTURE = `# License

MIT. Free for everyone.
`;

function setupTempProject(): { dir: string; templatesRoot: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-license-"));
  const templatesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-templates-"));
  fs.writeFileSync(path.join(templatesRoot, "LICENSE-SCAFFOLD.md"), TEMPLATE_FIXTURE);
  return { dir, templatesRoot };
}

describe("emitScaffoldLicense", () => {
  let dir: string;
  let templatesRoot: string;

  beforeEach(() => {
    const setup = setupTempProject();
    dir = setup.dir;
    templatesRoot = setup.templatesRoot;
  });

  it("writes LICENSE with the scaffold template body", () => {
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    expect(fs.readFileSync(path.join(dir, "LICENSE"), "utf-8")).toBe(TEMPLATE_FIXTURE);
  });

  it("preserves an upstream FSL LICENSE as LICENSE-UPSTREAM-REFERENCE.md", () => {
    fs.writeFileSync(
      path.join(dir, "LICENSE"),
      "# Functional Source License, Version 1.1, ALv2 Future License\n...",
    );
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.9.0",
      templatesRoot,
    });
    expect(fs.existsSync(path.join(dir, "LICENSE-UPSTREAM-REFERENCE.md"))).toBe(true);
    expect(fs.readFileSync(path.join(dir, "LICENSE-UPSTREAM-REFERENCE.md"), "utf-8")).toMatch(
      /Functional Source License/,
    );
    expect(fs.readFileSync(path.join(dir, "LICENSE"), "utf-8")).toBe(TEMPLATE_FIXTURE);
  });

  it("still preserves a legacy upstream AGPL LICENSE (pre-2026-07-26 checkouts)", () => {
    fs.writeFileSync(
      path.join(dir, "LICENSE"),
      "GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, ...",
    );
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.9.0",
      templatesRoot,
    });
    expect(fs.existsSync(path.join(dir, "LICENSE-UPSTREAM-REFERENCE.md"))).toBe(true);
    expect(fs.readFileSync(path.join(dir, "LICENSE-UPSTREAM-REFERENCE.md"), "utf-8")).toMatch(
      /GNU AFFERO/,
    );
  });

  it("does NOT preserve a LICENSE the user already replaced", () => {
    fs.writeFileSync(path.join(dir, "LICENSE"), "MIT License\nCopyright (c)...");
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.9.0",
      templatesRoot,
    });
    expect(fs.existsSync(path.join(dir, "LICENSE-UPSTREAM-REFERENCE.md"))).toBe(false);
    // LICENSE is overwritten with the scaffold template — that's the point.
    expect(fs.readFileSync(path.join(dir, "LICENSE"), "utf-8")).toBe(TEMPLATE_FIXTURE);
  });

  it("writes a signed scaffold marker that verifyScaffoldMeta accepts", () => {
    emitScaffoldLicense(dir, {
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
    expect(meta.license.tier).toBe("mit-scaffold");
    expect(typeof meta.signature).toBe("string");
    expect(meta.signature).toHaveLength(64); // sha256 hex
    expect(verifyScaffoldMeta(meta)).toBe(true);
  });

  it("verifyScaffoldMeta rejects tampered markers", () => {
    emitScaffoldLicense(dir, {
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
    emitScaffoldLicense(dir, {
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
    emitScaffoldLicense(dir, {
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
    emitScaffoldLicense(dir, {
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
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const readme = fs.readFileSync(path.join(dir, "README.md"), "utf-8");
    expect(readme).toMatch(/Scaffolded by `create-sailor`/);
    expect(readme).toMatch(/# demo/);
  });

  it("is idempotent on the README notice (re-running doesn't double-prepend)", () => {
    fs.writeFileSync(path.join(dir, "README.md"), "# demo\n");
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const after1 = fs.readFileSync(path.join(dir, "README.md"), "utf-8");
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.7.0",
      templatesRoot,
    });
    const after2 = fs.readFileSync(path.join(dir, "README.md"), "utf-8");
    const occurrences = (after2.match(/Scaffolded by `create-sailor`/g) ?? []).length;
    expect(occurrences).toBe(1);
    expect(after2).toBe(after1);
  });
});
