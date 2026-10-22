import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  countArbitraryFontSizes,
  countHardcodedHex,
  importsNebutraUi,
  scanApp,
  scanApps,
} from "./adoption.mjs";

describe("importsNebutraUi", () => {
  it("matches the package root and every subpath, in static, type and dynamic imports", () => {
    expect(importsNebutraUi(`import { Button } from "@nebutra/ui/primitives";`)).toBe(true);
    expect(importsNebutraUi(`import { cn } from '@nebutra/ui/utils'`)).toBe(true);
    expect(importsNebutraUi(`import type { X } from "@nebutra/ui";`)).toBe(true);
    expect(importsNebutraUi(`const m = await import("@nebutra/ui/components");`)).toBe(true);
    expect(importsNebutraUi(`export { Card } from "@nebutra/ui/primitives";`)).toBe(true);
  });

  it("does not match sibling packages that share the prefix, or a mention in prose", () => {
    expect(importsNebutraUi(`import x from "@nebutra/ui-extra";`)).toBe(false);
    expect(importsNebutraUi(`import { Search } from "@nebutra/icons";`)).toBe(false);
    expect(importsNebutraUi(`// uses @nebutra/ui/primitives for buttons`)).toBe(false);
  });
});

describe("countHardcodedHex", () => {
  it("counts 3, 4, 6 and 8 digit colours in code", () => {
    expect(countHardcodedHex(`const a = "#fff"; const b = "#0033FE"; const c = "#0033fe80";`)).toBe(
      3,
    );
    expect(countHardcodedHex(`style={{ color: "#abcd" }}`)).toBe(1);
  });

  it("ignores comments, so documenting a colour is not using one", () => {
    expect(countHardcodedHex(`// was #ff0000\n/* #00ff00 */ const a = 1;`)).toBe(0);
  });

  it("ignores in-page anchors and issue references", () => {
    expect(countHardcodedHex(`<a href="#add">x</a><a href={"#bad"}>y</a>`)).toBe(0);
    expect(countHardcodedHex(`const url = "https://example.com/#abcdef";`)).toBe(1);
  });

  it("does not match longer hex-looking runs or a hash glued to a word", () => {
    expect(countHardcodedHex(`const id = "item#123456789";`)).toBe(0);
    expect(countHardcodedHex(`const a = "#12345";`)).toBe(0);
  });

  it("counts a hex inside a Tailwind arbitrary value", () => {
    expect(countHardcodedHex(`<div className="bg-[#0033fe] text-[#333]" />`)).toBe(2);
  });
});

describe("countArbitraryFontSizes", () => {
  it("counts text-[Npx] with or without a variant prefix, once per occurrence", () => {
    expect(countArbitraryFontSizes(`"text-[13px] md:text-[11px] text-[13px]"`)).toBe(3);
    expect(countArbitraryFontSizes(`"text-[0.8rem] text-[1.25em]"`)).toBe(2);
  });

  it("leaves token sizes and non-size arbitrary values alone", () => {
    expect(
      countArbitraryFontSizes(
        `"text-sm text-2xs text-[var(--font-x)] text-[length:var(--font-y)]"`,
      ),
    ).toBe(0);
    expect(countArbitraryFontSizes(`"text-[#333] text-[color:red]"`)).toBe(0);
  });
});

describe("scanApp / scanApps", () => {
  let root: string;

  const write = (relative: string, contents: string) => {
    const file = join(root, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, contents);
  };

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "adoption-fixture-"));

    write(
      "alpha/package.json",
      JSON.stringify({ name: "alpha", nebutra: { status: "active", graph: "product" } }),
    );
    write(
      "alpha/src/a.tsx",
      `import { Button } from "@nebutra/ui/primitives";\nexport const A = () => <Button className="text-[13px]" />;\n`,
    );
    write(
      "alpha/src/b.tsx",
      `export const B = () => <p style={{ color: "#0033fe", background: "#fff" }} className="text-[11px] text-[12px]" />;\n`,
    );
    write(
      "alpha/src/nested/c.tsx",
      `import { Card } from "@nebutra/ui";\nexport const C = () => <Card />;\n`,
    );
    // Not counted: not tsx, vendored, generated, tests, stories.
    write("alpha/src/lib.ts", `import { x } from "@nebutra/ui"; const c = "#ff0000";\n`);
    write("alpha/node_modules/pkg/index.tsx", `const c = "#ff0000";\n`);
    write("alpha/.next/server/page.tsx", `const c = "#ff0000";\n`);
    write("alpha/src/a.test.tsx", `const c = "#ff0000";\n`);
    write("alpha/src/a.stories.tsx", `const c = "#ff0000";\n`);
    write("alpha/src/__tests__/d.tsx", `const c = "#ff0000";\n`);

    write("beta/package.json", JSON.stringify({ name: "beta" }));
    write("beta/src/index.ts", `export {};\n`);

    write("gamma/src/x.tsx", `export const X = () => <div />;\n`);
    // A stray file at the top level is not an app.
    write("README.md", "# apps\n");
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("counts tsx files, ui-importing files, hex and arbitrary sizes for one app", () => {
    const alpha = scanApp(join(root, "alpha"));
    expect(alpha).toMatchObject({
      name: "alpha",
      status: "active",
      graph: "product",
      tsxFiles: 3,
      uiFiles: 2,
      hardcodedHex: 2,
      arbitraryFontSizes: 3,
    });
    expect(alpha.uiRatio).toBeCloseTo(2 / 3, 4);
  });

  it("reports a ratio of null, not zero, when an app has no tsx to adopt anything", () => {
    const beta = scanApp(join(root, "beta"));
    expect(beta.tsxFiles).toBe(0);
    expect(beta.uiRatio).toBeNull();
    expect(beta.status).toBeNull();
  });

  it("reads zero adoption as zero when there is tsx and no import", () => {
    const gamma = scanApp(join(root, "gamma"));
    expect(gamma).toMatchObject({ tsxFiles: 1, uiFiles: 0, uiRatio: 0, status: null });
  });

  it("scans every directory under the apps root, sorted by name, with totals", () => {
    const report = scanApps(root);
    expect(report.apps.map((app: { name: string }) => app.name)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
    expect(report.totals).toMatchObject({
      apps: 3,
      tsxFiles: 4,
      uiFiles: 2,
      hardcodedHex: 2,
      arbitraryFontSizes: 3,
    });
    expect(report.totals.uiRatio).toBeCloseTo(2 / 4, 4);
  });

  it("is deterministic, so the committed JSON only changes when the code does", () => {
    expect(JSON.stringify(scanApps(root))).toBe(JSON.stringify(scanApps(root)));
  });

  it("documents what it skipped, so the page can say so", () => {
    const report = scanApps(root);
    expect(report.excluded.directories).toContain("node_modules");
    expect(report.excluded.files).toEqual(expect.arrayContaining([".test.tsx", ".stories.tsx"]));
  });
});
