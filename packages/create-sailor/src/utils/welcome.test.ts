import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateWelcomePage } from "./welcome.js";

describe("generateWelcomePage", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("writes fresh-scaffold brand guidance without the removed sailor command", async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-welcome-"));
    tempDirs.push(targetDir);

    fs.mkdirSync(path.join(targetDir, "apps", "web"), { recursive: true });

    await generateWelcomePage(targetDir, {
      projectName: "Acme",
      region: "global",
    });

    const nextSteps = fs.readFileSync(path.join(targetDir, ".sailor", "next-steps.md"), "utf8");
    const welcomePage = fs.readFileSync(
      path.join(targetDir, "apps", "web", "src", "app", "[locale]", "welcome", "page.tsx"),
      "utf8",
    );

    expect(nextSteps).toContain("pnpm brand:init");
    expect(nextSteps).toContain("pnpm brand:apply");
    expect(nextSteps).not.toContain("pnpm sailor");

    expect(welcomePage).toContain('command="pnpm brand:init"');
    expect(welcomePage).toContain("pnpm brand:apply");
    expect(welcomePage).not.toContain("pnpm sailor");
  });
});
