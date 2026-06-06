import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("microcopy governance", () => {
  it("keeps launch and waitlist copy out of startup-bro hype", () => {
    const sources = [
      "packages/commerce/marketing/src/components/LaunchBanner.tsx",
      "packages/commerce/marketing/src/components/Waitlist.tsx",
      "apps/landing-page/src/components/marketing/LaunchBannerWrapper.tsx",
      "apps/landing-page/src/lib/landing-content.ts",
    ].map(read);

    for (const source of sources) {
      expect(source).not.toContain("🚀");
      expect(source).not.toContain("Live Now!");
      expect(source).not.toContain("We're live on Product Hunt!");
      expect(source).not.toContain("Vote Now 🚀");
      expect(source).not.toContain("Joined!");
      expect(source).not.toContain("Thanks for joining!");
      expect(source).not.toContain('ctaPrimary: "Get Started"');
    }

    expect(read("packages/commerce/marketing/src/components/LaunchBanner.tsx")).toContain(
      "Live now",
    );
    expect(read("packages/commerce/marketing/src/components/Waitlist.tsx")).toContain(
      "You're on the list.",
    );
    expect(read("apps/landing-page/src/lib/landing-content.ts")).toContain(
      'ctaPrimary: "Create your first workspace"',
    );
  });
});
