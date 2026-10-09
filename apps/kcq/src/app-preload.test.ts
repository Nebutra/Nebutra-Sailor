import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM build helper without types.
import { appPreloads } from "../scripts/app-preload.mjs";

const chunk = (fileName: string, extra: Record<string, unknown> = {}) => ({
  type: "chunk",
  fileName,
  imports: [],
  dynamicImports: [],
  ...extra,
});

describe("workbench shell preloads", () => {
  const bundle = Object.fromEntries(
    [
      chunk("assets/index.js", {
        imports: ["assets/vue.js"],
        dynamicImports: ["assets/market-connectors.js", "assets/workbench.js", "assets/profile.js"],
      }),
      chunk("assets/vue.js"),
      chunk("assets/market-connectors.js", {
        facadeModuleId: "/repo/apps/kcq/src/market-connectors.ts",
        imports: ["assets/provider.js"],
      }),
      chunk("assets/provider.js"),
      chunk("assets/workbench.js", {
        facadeModuleId: "/repo/apps/kcq/src/workbench.vue",
        imports: ["assets/chart.js", "assets/vue.js"],
        dynamicImports: ["assets/indicator.js"],
        viteMetadata: { importedCss: new Set(["assets/workbench.css"]) },
      }),
      chunk("assets/chart.js", { imports: ["assets/provider.js"] }),
      chunk("assets/indicator.js"),
      chunk("assets/profile.js", { facadeModuleId: "/repo/apps/kcq/src/profile.vue" }),
    ].map((item) => [item.fileName, item]),
  );

  it("preloads the workbench route's dynamic imports and their static graph", () => {
    expect(appPreloads(bundle, bundle["assets/index.js"])).toEqual({
      scripts: [
        "assets/chart.js",
        "assets/market-connectors.js",
        "assets/provider.js",
        "assets/workbench.js",
      ],
      styles: ["assets/workbench.css"],
    });
  });

  it("leaves out what the entry already loads, the profile page and lazy indicators", () => {
    const { scripts } = appPreloads(bundle, bundle["assets/index.js"]);
    expect(scripts).not.toContain("assets/vue.js");
    expect(scripts).not.toContain("assets/profile.js");
    expect(scripts).not.toContain("assets/indicator.js");
  });
});
