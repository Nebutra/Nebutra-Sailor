import { describe, expect, it } from "vitest";
import {
  buildCategoryHub,
  buildToolPageModel,
  countText,
  createForgeMcpHandlers,
  ForgeRegistry,
  invokeTool,
} from "./index";
import { markdownToSimplePdf } from "./tools/md-to-pdf";

describe("countText", () => {
  it("counts CJK and latin words", () => {
    const result = countText("你好 world");
    expect(result.cjkCharacters).toBe(2);
    // Segmenter may treat CJK runs as one or more word-like units depending on locale
    expect(result.words).toBeGreaterThanOrEqual(2);
    expect(result.engine).toMatch(/Segmenter|fallback/);
    expect(result.characters).toBeGreaterThan(0);
  });
});

describe("ForgeRegistry", () => {
  it("lists F0 batch-1 tools and resolves by slug", () => {
    const registry = ForgeRegistry.openDefault();
    const tools = registry.list();
    expect(tools.length).toBeGreaterThanOrEqual(25);
    expect(tools.every((t) => typeof t.sotaStatus === "string")).toBe(true);
    expect(tools.some((t) => t.sotaStatus === "production")).toBe(true);
    expect(tools.some((t) => t.sotaStatus === "lab" || t.sotaStatus === "scaffold")).toBe(true);
    expect(registry.get("word-count").id).toBe("text/word-count");
    expect(registry.search("json").some((t) => t.slug === "json-format")).toBe(true);
    expect(registry.categories()).toContain("text");
  });
});

describe("invokeTool", () => {
  const registry = ForgeRegistry.openDefault();

  it("invokes word-count successfully", async () => {
    const result = await invokeTool(registry, {
      toolId: "text/word-count",
      input: { text: "hello world" },
      requestId: "req_test",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toMatchObject({ words: 2 });
      expect(result.meterId).toBe("forge.text.word_count");
      expect(result.requestId).toBe("req_test");
    }
  });

  it("returns invalid_input for bad payload", async () => {
    const result = await invokeTool(registry, {
      toolId: "data/json-format",
      input: { text: 123 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_input");
    }
  });

  it("returns tool_not_found", async () => {
    const result = await invokeTool(registry, {
      toolId: "no/such-tool",
      input: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("tool_not_found");
    }
  });

  it("formats valid json", async () => {
    const result = await invokeTool(registry, {
      toolId: "json-format",
      input: { text: '{"a":1}', mode: "format", indent: 2 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(String((result.output as { result: string }).result)).toContain('"a"');
    }
  });
});

describe("buildToolPageModel", () => {
  it("builds dual-surface page model for human template", () => {
    const registry = ForgeRegistry.openDefault();
    const page = buildToolPageModel(registry, "base64");
    expect(page.path).toBe("/t/base64");
    expect(page.api.path).toContain("/v1/tools/");
    expect(page.api.exampleCurl).toContain("curl");
    expect(page.seo.title.zh).toContain("Base64");
    expect(page.engine.name).toBeTruthy();
  });

  it("builds category hub for home IA", () => {
    const hub = buildCategoryHub(ForgeRegistry.openDefault());
    expect(hub.categories.length).toBeGreaterThan(0);
    expect(hub.tools.length).toBeGreaterThanOrEqual(8);
  });
});

describe("md-to-pdf + mcp", () => {
  it("writes a valid PDF header via marked simple path", () => {
    const pdf = markdownToSimplePdf("# Hello\n\n**world**\n\n- a\n- b", "Test");
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("renderMarkdownPdf simple engine returns PDF and marks simple render", async () => {
    const { renderMarkdownPdf } = await import("./tools/md-to-pdf.js");
    const out = await renderMarkdownPdf({
      markdown: "# Title\n\nHello **PDF**",
      title: "T",
      engine: "simple",
    });
    expect(out.renderEngine).toBe("simple");
    expect(out.buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("md-to-pdf tool invoke with simple engine uses real tool entry", async () => {
    const registry = ForgeRegistry.openDefault();
    const result = await invokeTool(registry, {
      toolId: "doc/md-to-pdf",
      input: {
        markdown: "# SOTA path\n\n- item",
        title: "Doc",
        engine: "simple",
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const output = result.output as {
        renderEngine: string;
        base64: string;
        engine: string;
      };
      expect(output.renderEngine).toBe("simple");
      expect(Buffer.from(output.base64, "base64").subarray(0, 5).toString("utf8")).toBe("%PDF-");
    }
  });

  it("diffs with jsdiff engine", async () => {
    const registry = ForgeRegistry.openDefault();
    const result = await invokeTool(registry, {
      toolId: "text/diff",
      input: { left: "a\nb", right: "a\nc" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(String((result.output as { engine: string }).engine)).toBe("diff");
    }
  });

  it("lists and calls MCP-shaped tools", async () => {
    const registry = ForgeRegistry.openDefault();
    const mcp = createForgeMcpHandlers(registry);
    const tools = mcp.listTools();
    expect(tools.some((t) => t.name === "text__word-count")).toBe(true);
    const result = await mcp.callTool("text__word-count", { text: "a b" });
    expect(result.isError).toBeFalsy();
    expect(result.content[0]?.text).toContain("words");
  });
});
