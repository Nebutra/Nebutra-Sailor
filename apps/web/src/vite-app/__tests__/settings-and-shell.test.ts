import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describeDevice } from "../settings/devices";

const viteApp = path.resolve(__dirname, "..");
const read = (relative: string) => readFileSync(path.join(viteApp, relative), "utf8");

function exportedNames(source: string): string[] {
  return [...source.matchAll(/export (?:const|function|type|interface) (\w+)/g)]
    .map((match) => match[1] ?? "")
    .sort();
}

describe("product shell template variants", () => {
  it.each([
    ["app-shell.tsx", "app-shell.for-template.tsx"],
    ["product-routes.ts", "product-routes.for-template.ts"],
  ])("%s and its template variant export the same names", (base, variant) => {
    expect(exportedNames(read(variant))).toEqual(exportedNames(read(base)));
  });

  it("keeps Nebutra's own products and dev tools out of a fresh project", () => {
    const shell = read("app-shell.for-template.tsx");
    expect(shell).not.toMatch(/startup-os|Startup OS/);
    expect(shell).not.toContain("react-query-devtools");
    expect(read("product-routes.for-template.ts")).not.toContain("startup-os");
    // The root and the router reach products only through these two modules.
    expect(read("routes/__root.tsx")).not.toMatch(/startup-os|react-query-devtools/);
    expect(read("router.tsx")).not.toContain("startup-os");
  });
});

describe("customer-facing settings and shell copy", () => {
  const sources = [
    "routes/__root.tsx",
    "routes/settings.tsx",
    ...readdirSync(path.join(viteApp, "settings"))
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => `settings/${file}`),
  ];

  it.each(sources)("%s says nothing about how the app is built", (file) => {
    const text = read(file)
      // comments are for developers
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const code = text.replace(/^import[\s\S]*?from ".*";$/gm, "");
    const visible = [
      ...[...code.matchAll(/>([^<>{}]+)</g)].map((match) => match[1]),
      ...[...code.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map((match) => match[1] ?? match[2]),
    ].join(" ");
    expect(visible).not.toMatch(
      /TanStack|React Query|gateway|BFF|boundary|facade|API client|Product App|search state/i,
    );
  });

  it("keeps the heading release checks wait for", () => {
    expect(read("routes/settings.tsx")).toContain(">Settings</h1>");
  });
});

describe("describeDevice", () => {
  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0 Safari/537.36",
      "Chrome on macOS",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
      "Firefox on Windows",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Safari on iOS",
    ],
    ["curl/8.7.1", "Command line"],
    [null, "Unknown device"],
  ])("%s → %s", (userAgent, expected) => {
    expect(describeDevice(userAgent)).toBe(expected);
  });
});
