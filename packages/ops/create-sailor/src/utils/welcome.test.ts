import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateWelcomePage } from "./welcome";

describe("generateWelcomePage", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("writes the next-steps cheat sheet, leading with the zero-setup preview", async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-welcome-"));
    tempDirs.push(targetDir);
    fs.mkdirSync(path.join(targetDir, "apps", "web"), { recursive: true });

    await generateWelcomePage(targetDir, { projectName: "Acme" });

    const nextSteps = fs.readFileSync(path.join(targetDir, ".sailor", "next-steps.md"), "utf8");
    expect(nextSteps).toContain("# Next steps — Acme");
    expect(nextSteps.indexOf("pnpm dev")).toBeLessThan(nextSteps.indexOf("pnpm db:migrate"));
    expect(nextSteps).toContain("http://localhost:3001/welcome");
    expect(nextSteps).toContain("pnpm brand:init");
    expect(nextSteps).toContain("pnpm brand:apply");
    expect(nextSteps).not.toContain("pnpm sailor");
    expect(nextSteps).not.toContain("get-license");
    expect(nextSteps).toContain("https://nebutra.com/licensing");
  });

  it("no longer writes a page into the retired Next.js app tree", async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-sailor-welcome-"));
    tempDirs.push(targetDir);
    fs.mkdirSync(path.join(targetDir, "apps", "web"), { recursive: true });

    await generateWelcomePage(targetDir, { projectName: "Acme" });

    expect(
      fs.existsSync(path.join(targetDir, "apps", "web", "src", "app", "[locale]", "welcome")),
    ).toBe(false);
  });
});
