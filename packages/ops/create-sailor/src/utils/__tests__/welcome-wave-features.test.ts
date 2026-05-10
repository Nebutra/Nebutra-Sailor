import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateWelcomePage } from "../welcome.js";

describe("generateWelcomePage — wave 3-5 hints", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("renders the 'What you can do next' section with default bullets", async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-welcome-wave-"));
    tempDirs.push(targetDir);

    await generateWelcomePage(targetDir, {
      projectName: "Acme",
      region: "global",
    });

    const nextSteps = fs.readFileSync(path.join(targetDir, ".sailor", "next-steps.md"), "utf8");

    expect(nextSteps).toContain("## What you can do next");
    expect(nextSteps).toContain("/settings/api-keys");
    expect(nextSteps).toContain("/settings/audit-log");
    expect(nextSteps).toContain("/settings/webhooks");
    expect(nextSteps).toContain("/settings/notifications");
    expect(nextSteps).toContain("/settings/account/export");
    expect(nextSteps).toContain("packages/ops/china-compliance/README.md");
    expect(nextSteps).toContain("⌘K");
  });

  it("annotates disabled features with re-enable hints", async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-welcome-wave-"));
    tempDirs.push(targetDir);

    await generateWelcomePage(targetDir, {
      projectName: "Acme",
      region: "global",
      waveFeatures: {
        apiKeys: false,
        auditLog: false,
        commandPalette: false,
      },
    });

    const nextSteps = fs.readFileSync(path.join(targetDir, ".sailor", "next-steps.md"), "utf8");

    expect(nextSteps).toContain("--api-keys=true");
    expect(nextSteps).toContain("--audit-log=true");
    expect(nextSteps).toContain("--command-palette=true");
  });
});
