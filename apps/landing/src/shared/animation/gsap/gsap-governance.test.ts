import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const appRoot = path.resolve(path.dirname(__filename), "../../../../");
const packageJson = JSON.parse(readFileSync(path.join(appRoot, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
};

const gsapRoot = "src/shared/animation/gsap/";
const gsapRuntimeSource = readFileSync(path.join(appRoot, `${gsapRoot}helpers/runtime.ts`), "utf8");
const gsapHookSource = readFileSync(
  path.join(appRoot, `${gsapRoot}hooks/use-landing-gsap.ts`),
  "utf8",
);

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    const relative = path.relative(appRoot, absolute);
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      if ([".next", "node_modules", "__tests__"].includes(entry)) continue;
      files.push(...collectSourceFiles(absolute));
      continue;
    }

    if (stat.isFile() && /\.(ts|tsx)$/.test(entry) && !relative.endsWith(".test.ts")) {
      files.push(relative);
    }
  }

  return files;
}

describe("landing GSAP governance", () => {
  it("installs GSAP through package dependencies instead of CDN globals", () => {
    expect(packageJson.dependencies.gsap).toMatch(/^\^3\./);
    expect(packageJson.dependencies["@gsap/react"]).toMatch(/^\^2\./);
    expect(gsapRuntimeSource).not.toContain("cdnjs.cloudflare.com");
    expect(gsapRuntimeSource).not.toContain("window.gsap");
  });

  it("centralizes GSAP registration, ScrollTrigger defaults, and reduced-motion policy", () => {
    expect(gsapRuntimeSource).toContain('"use client"');
    expect(gsapRuntimeSource).toContain('from "@gsap/react"');
    expect(gsapRuntimeSource).toContain('from "gsap"');
    expect(gsapRuntimeSource).toContain('from "gsap/ScrollTrigger"');
    expect(gsapRuntimeSource).toContain("gsap.registerPlugin(useGSAP, ScrollTrigger)");
    expect(gsapRuntimeSource).toContain("ScrollTrigger.defaults");
    expect(gsapRuntimeSource).toContain("prefers-reduced-motion: reduce");
    expect(gsapRuntimeSource).toContain("MARKETING_GSAP_SELECTORS");
    expect(gsapRuntimeSource).toContain("createMarketingTimeline");
    expect(gsapRuntimeSource).toContain("createMarketingMatchMedia");
  });

  it("exposes scoped hooks with cleanup and reduced-motion gating", () => {
    expect(gsapHookSource).toContain('"use client"');
    expect(gsapHookSource).toContain("useGSAP(");
    expect(gsapHookSource).toContain("scope");
    expect(gsapHookSource).toContain("revertOnUpdate = true");
    expect(gsapHookSource).toContain("prefersReducedMarketingMotion()");
  });

  it("keeps landing GSAP imports behind the shared marketing animation layer", () => {
    const offenders = collectSourceFiles(path.join(appRoot, "src"))
      .filter((file) => !file.startsWith(gsapRoot))
      .filter((file) => {
        const source = readFileSync(path.join(appRoot, file), "utf8");
        return /from ["'](?:@gsap\/react|gsap(?:\/[^"']*)?)["']|window\.gsap|ScrollTrigger\.min\.js/.test(
          source,
        );
      });

    expect(offenders).toEqual([]);
  });
});
