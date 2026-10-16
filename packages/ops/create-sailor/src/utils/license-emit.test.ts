import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { emitScaffoldLicense, LICENSE_TEMPLATE_FILENAME } from "./license-emit";

const TEMPLATE_FIXTURE = `
                                 Apache License
                           Version 2.0, January 2004
`;

function setupTempProject(): { dir: string; templatesRoot: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-license-"));
  const templatesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-templates-"));
  fs.writeFileSync(path.join(templatesRoot, LICENSE_TEMPLATE_FILENAME), TEMPLATE_FIXTURE);
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

  it("ships the bundled template as the verbatim Apache-2.0 text", () => {
    const bundled = fs.readFileSync(
      path.join(__dirname, "..", "..", "templates", LICENSE_TEMPLATE_FILENAME),
      "utf-8",
    );
    expect(bundled).toMatch(/^\s+Apache License\n\s+Version 2\.0, January 2004/);
    expect(bundled).toMatch(/END OF TERMS AND CONDITIONS/);
  });

  it("writes a NOTICE carrying the Nebutra Sailor attribution", () => {
    emitScaffoldLicense(dir, { projectName: "demo", cliVersion: "2.1.0", templatesRoot });
    const notice = fs.readFileSync(path.join(dir, "NOTICE"), "utf-8");
    expect(notice).toMatch(/^demo\n/);
    expect(notice).toMatch(/create-sailor 2\.1\.0/);
    expect(notice).toMatch(/Copyright 2025-2026 无锡云毓智能科技有限公司/);
    expect(notice).toMatch(/Apache License, Version 2\.0/);
  });

  it("overwrites a pre-relicense FSL LICENSE from a stale mirror without keeping a copy", () => {
    fs.writeFileSync(
      path.join(dir, "LICENSE"),
      "# Functional Source License, Version 1.1, ALv2 Future License\n...",
    );
    emitScaffoldLicense(dir, { projectName: "demo", cliVersion: "2.1.0", templatesRoot });
    expect(fs.readFileSync(path.join(dir, "LICENSE"), "utf-8")).toBe(TEMPLATE_FIXTURE);
    expect(fs.existsSync(path.join(dir, "LICENSE-UPSTREAM-REFERENCE.md"))).toBe(false);
  });

  it("removes licence files from earlier models so one set of terms remains", () => {
    for (const legacy of ["LICENSE-COMMERCIAL.md", "NOTICE.md", "LICENSE-UPSTREAM-REFERENCE.md"]) {
      fs.writeFileSync(path.join(dir, legacy), "legacy terms\n");
    }
    const { wrote } = emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "2.1.0",
      templatesRoot,
    });
    for (const legacy of ["LICENSE-COMMERCIAL.md", "NOTICE.md", "LICENSE-UPSTREAM-REFERENCE.md"]) {
      expect(fs.existsSync(path.join(dir, legacy))).toBe(false);
    }
    expect(wrote).toContain("LICENSE");
    expect(wrote).toContain("NOTICE");
  });

  it("writes an unsigned provenance marker", () => {
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.9.0",
      templatesRoot,
    });
    const metaPath = path.join(dir, ".nebutra", "scaffold-meta.json");
    expect(fs.existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    expect(meta.schemaVersion).toBe(1);
    expect(meta.projectName).toBe("demo");
    expect(meta.cliVersion).toBe("1.9.0");
    expect(meta.license.tier).toBe("apache-2.0");
    expect(meta.license.file).toBe("LICENSE");
  });

  /**
   * The HMAC, nonce and signing-key registry were removed on 2026-07-26 along
   * with the licence tier they protected. Nothing about the scaffolded
   * project's rights depends on this file any more, so signing it would only
   * imply an authority it no longer has.
   */
  it("carries no signature, nonce, or signing key", () => {
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.9.0",
      templatesRoot,
    });
    const meta = JSON.parse(
      fs.readFileSync(path.join(dir, ".nebutra", "scaffold-meta.json"), "utf-8"),
    );
    expect(meta.signature).toBeUndefined();
    expect(meta.nonce).toBeUndefined();
    expect(meta.signingKeyId).toBeUndefined();
  });

  it("states in the file itself that it grants nothing", () => {
    emitScaffoldLicense(dir, {
      projectName: "demo",
      cliVersion: "1.9.0",
      templatesRoot,
    });
    const meta = JSON.parse(
      fs.readFileSync(path.join(dir, ".nebutra", "scaffold-meta.json"), "utf-8"),
    );
    expect(meta.purpose).toMatch(/Provenance only/i);
    expect(meta.purpose).toMatch(/Deleting it costs you nothing/i);
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
    expect(readme).toMatch(/\[Apache-2\.0\]\(\.\/LICENSE\)/);
    expect(readme).not.toMatch(/MIT|FSL/);
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
