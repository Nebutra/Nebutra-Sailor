import { describe, expect, it } from "vitest";
import { detectLanguage, rewriteLinks, semverCompare, takeTitle } from "./markdown.mjs";
import { splitRelease } from "./pages.mjs";
import { groupTools, minimalInput, schemaRows } from "./tools.mjs";

describe("release notes", () => {
  it("splits each bilingual line pair into its language", () => {
    const note = [
      "# v1.2.0",
      "",
      "## 相比 v1.1.0 的变更 / Changes since v1.1.0",
      "",
      "### ✨ 新功能 / Features",
      "",
      "- **截图**: 新增原生帧截图。",
      "- **Screenshot**: Adds native frame capture with `captureFrame()`.",
    ].join("\n");
    const { en, zh } = splitRelease(note);
    expect(en).toContain("## Changes since v1.1.0");
    expect(en).toContain("### Features");
    expect(en).toContain("Adds native frame capture");
    expect(en).not.toMatch(/[一-鿿]/);
    expect(zh).toContain("### 新功能");
    expect(zh).toContain("新增原生帧截图");
    expect(zh).not.toContain("Adds native");
  });

  it("orders versions newest first, prereleases before their release", () => {
    const versions = ["v0.10.0", "v0.11.0-alpha.2", "v0.9.6", "v0.11.0-alpha.10", "v0.11.0"];
    expect(versions.sort((a, b) => semverCompare(b, a))).toEqual([
      "v0.11.0",
      "v0.11.0-alpha.10",
      "v0.11.0-alpha.2",
      "v0.10.0",
      "v0.9.6",
    ]);
  });
});

describe("imported documents", () => {
  it("detects the language a document is written in", () => {
    expect(detectLanguage("本文描述渲染主链路的细节，以及状态如何进入一帧。")).toBe("zh");
    expect(detectLanguage("This document describes the rendering pipeline.")).toBe("en");
  });

  it("takes the first H1 as the title", () => {
    expect(takeTitle("# 系统架构\n\n正文", "x")).toEqual({ title: "系统架构", body: "正文" });
  });

  it("points links to imported pages at the docs and the rest at the pinned commit", () => {
    const links = { blob: (file: string) => `https://github.com/o/r/blob/abc/${file}` };
    const out = rewriteLinks(
      "[a](../rendering/pipeline.md#frame) [b](../../packages/core/src/x.ts)",
      {
        from: "docs/architecture/architecture.md",
        source: "/nowhere",
        links,
        rawBase: "https://raw.githubusercontent.com/o/r/abc",
        routeFor: (target: string) =>
          target === "docs/rendering/pipeline.md" ? "/docs/architecture/rendering-pipeline" : null,
      },
    );
    expect(out).toContain("(/docs/architecture/rendering-pipeline#frame)");
    expect(out).toContain("(https://github.com/o/r/blob/abc/packages/core/src/x.ts)");
  });
});

describe("agent tool reference", () => {
  const schema = {
    type: "object",
    required: ["kind", "anchors"],
    properties: {
      kind: { enum: ["trend-line", "ray"] },
      anchors: {
        type: "array",
        minItems: 2,
        items: {
          type: "object",
          required: ["price"],
          properties: {
            tradingDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            price: { type: "number" },
          },
        },
      },
      style: {
        type: "object",
        properties: { strokeWidth: { type: "number", exclusiveMinimum: 0 } },
      },
    },
    additionalProperties: false,
  };

  it("flattens nested parameters into dotted rows with constraints", () => {
    const rows = schemaRows(schema);
    expect(rows.map((r: { path: string }) => r.path)).toEqual([
      "kind",
      "anchors",
      "anchors[].tradingDate",
      "anchors[].price",
      "style",
      "style.strokeWidth",
    ]);
    const kind = rows.find((r: { path: string }) => r.path === "kind");
    expect(kind.type).toBe("enum");
    expect(kind.required).toBe(true);
    expect(rows.find((r: { path: string }) => r.path === "style.strokeWidth").required).toBe(false);
  });

  it("builds a minimal input from required fields only", () => {
    expect(minimalInput(schema)).toEqual({
      kind: "trend-line",
      anchors: [{ price: 0 }, { price: 0 }],
    });
  });

  it("refuses a tool that no reference group claims", () => {
    expect(() => groupTools([{ name: "brand_new_tool" }])).toThrow(/brand_new_tool/);
  });
});
