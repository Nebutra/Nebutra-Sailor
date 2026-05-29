import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyComplianceTemplates } from "./compliance";

describe("applyComplianceTemplates", () => {
  let targetDir: string | undefined;

  afterEach(() => {
    if (targetDir) {
      fs.rmSync(targetDir, { force: true, recursive: true });
      targetDir = undefined;
    }
  });

  it("generates a concise cookie banner template", async () => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-compliance-"));
    fs.mkdirSync(path.join(targetDir, "apps", "web"), { recursive: true });

    await applyComplianceTemplates(targetDir, "global");

    const bannerPath = path.join(
      targetDir,
      "apps",
      "web",
      "src",
      "components",
      "compliance",
      "CookieBanner.tsx",
    );
    const source = fs.readFileSync(bannerPath, "utf8");

    expect(source).toContain("Your Privacy Choices");
    expect(source).toContain("Optional Cookies");
    expect(source).toContain("Only Necessary");
    expect(source).toContain("Manage Choices");
    expect(source).not.toContain("CategoryRow");
    expect(source).not.toContain("grid gap-3 md:grid-cols-2");
  });
});
