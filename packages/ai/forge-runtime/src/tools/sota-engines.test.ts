import { describe, expect, it } from "vitest";
import { ForgeRegistry, invokeTool } from "../index";

describe("SOTA engine re-entry", () => {
  const registry = ForgeRegistry.openDefault();

  it("css-minify uses CSSO", async () => {
    const r = await invokeTool(registry, {
      toolId: "dev/css-minify",
      input: { text: "body {  color:   red;  /* c */ }" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.output as { result: string; engine: string; saved: number };
    expect(out.engine).toBe("csso");
    expect(out.result).toContain("color:red");
    expect(out.result).not.toContain("/*");
    expect(out.saved).toBeGreaterThan(0);
  });

  it("css-format uses Prettier", async () => {
    const r = await invokeTool(registry, {
      toolId: "dev/css-format",
      input: { text: "body{color:red}", indent: 2 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.output as { result: string; engine: string };
    expect(out.engine).toBe("prettier");
    expect(out.result).toMatch(/body\s*\{/);
  });

  it("html-minify uses html-minifier-terser", async () => {
    const r = await invokeTool(registry, {
      toolId: "dev/html-minify",
      input: { text: "<html>  <!--x-->  <body>  hi  </body></html>" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.output as { result: string; engine: string };
    expect(out.engine).toBe("html-minifier-terser");
    expect(out.result).not.toContain("<!--");
    expect(out.result.length).toBeLessThan(
      "<html>  <!--x-->  <body>  hi  </body></html>".length,
    );
  });

  it("html-format uses Prettier", async () => {
    const r = await invokeTool(registry, {
      toolId: "dev/html-format",
      input: { text: "<div><span>a</span></div>", indent: 2 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.output as { result: string; engine: string };
    expect(out.engine).toBe("prettier");
    expect(out.result).toContain("<div>");
  });

  it("svg-optimize uses SVGO", async () => {
    const r = await invokeTool(registry, {
      toolId: "image/svg-optimize",
      input: {
        text: '<svg xmlns="http://www.w3.org/2000/svg"><!--n--><g><rect width="10" height="10"/></g></svg>',
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.output as { result: string; engine: string };
    expect(out.engine).toBe("svgo");
    expect(out.result).toMatch(/<svg/i);
  });

  it("user-agent-parse uses ua-parser-js", async () => {
    const r = await invokeTool(registry, {
      toolId: "dev/user-agent-parse",
      input: {
        text: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = r.output as {
      browser: string;
      parser: string;
      os: string;
    };
    expect(out.parser).toBe("ua-parser-js");
    expect(out.browser).toMatch(/Chrome/i);
    expect(out.os).toMatch(/macOS|Mac OS/i);
  });
});
