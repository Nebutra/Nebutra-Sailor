import { afterEach, describe, expect, it, vi } from "vitest";
import { showDone } from "./done.js";

describe("showDone", () => {
  const originalNoColor = process.env.NO_COLOR;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
  });

  it("prints only scaffolded pnpm next steps", () => {
    process.env.NO_COLOR = "1";

    let output = "";
    vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stdout.write);

    showDone({
      elapsedSec: 12,
      targetDir: "demo-app",
      skippedInstall: true,
    });

    expect(output).toContain("pnpm install");
    expect(output).toContain("pnpm db:migrate");
    expect(output).toContain("pnpm db:seed");
    expect(output).toContain("pnpm brand:init");
    expect(output).toContain("pnpm brand:apply");
    expect(output).toContain("pnpm preset:env");
    expect(output).toContain("pnpm generate:api-types");
    expect(output).not.toContain("pnpm sailor");
    expect(output).not.toContain("sailor add");
  });
});
