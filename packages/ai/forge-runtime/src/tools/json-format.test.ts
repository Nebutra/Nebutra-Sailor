import { describe, expect, it } from "vitest";
import { invokeTool } from "../invoke";
import { ForgeRegistry } from "../registry";
import { sortJsonKeys } from "./json-format";

const registry = ForgeRegistry.openDefault();

describe("data/json-format", () => {
  it("formats and minifies", async () => {
    const pretty = await invokeTool(registry, {
      toolId: "data/json-format",
      input: { text: '{"b":1,"a":2}', mode: "format", indent: 2 },
    });
    expect(pretty.ok).toBe(true);
    if (pretty.ok) {
      expect((pretty.output as { result: string }).result).toContain("\n");
    }

    const mini = await invokeTool(registry, {
      toolId: "data/json-format",
      input: { text: '{\n  "a": 1\n}', mode: "minify" },
    });
    expect(mini.ok).toBe(true);
    if (mini.ok) {
      expect((mini.output as { result: string }).result).toBe('{"a":1}');
    }
  });

  it("sorts keys when sortKeys is true", async () => {
    const r = await invokeTool(registry, {
      toolId: "data/json-format",
      input: {
        text: '{"z":1,"a":{"d":1,"c":2},"m":3}',
        mode: "minify",
        sortKeys: true,
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.output as { result: string }).result).toBe('{"a":{"c":2,"d":1},"m":3,"z":1}');
  });

  it("validate mode returns pretty output without changing contract", async () => {
    const r = await invokeTool(registry, {
      toolId: "data/json-format",
      input: { text: '{"ok":true}', mode: "validate" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((r.output as { mode: string }).mode).toBe("validate");
      expect((r.output as { valid: boolean }).valid).toBe(true);
    }
  });

  it("rejects invalid JSON with a parse error message", async () => {
    const r = await invokeTool(registry, {
      toolId: "data/json-format",
      input: { text: '{"a":' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // V8 may say "Unexpected end of JSON input" without position; either is fine.
      expect(r.message.length).toBeGreaterThan(0);
    }

    const withPos = await invokeTool(registry, {
      toolId: "data/json-format",
      input: { text: '{\n  "a": 1,\n  "b": }\n' },
    });
    expect(withPos.ok).toBe(false);
  });

  it("sortJsonKeys is recursive", () => {
    expect(sortJsonKeys({ b: 1, a: [{ z: 1, a: 2 }] })).toEqual({
      a: [{ a: 2, z: 1 }],
      b: 1,
    });
  });
});
