import { describe, expect, it } from "vitest";
import type { ApiBlock, ApiProp } from "./api-docs";
import { mergeCva } from "./api-merge";
import type { CvaSpec } from "./ui-source";

const prop = (overrides: Partial<ApiProp> & { name: string }): ApiProp => ({
  type: "string",
  required: false,
  description: "",
  defaultValue: null,
  deprecated: null,
  ...overrides,
});

const block = (props: ApiProp[], parts: ApiBlock[] = []): ApiBlock => ({
  name: "Button",
  kind: "component",
  description: "",
  props,
  inherited: [],
  signatures: [],
  members: [],
  parts,
});

const spec: CvaSpec = {
  name: "buttonVariants",
  file: "x",
  variants: { size: ["default", "sm", "lg"], variant: ["solid", "outline"] },
  defaults: { size: "default" },
};

describe("mergeCva", () => {
  it("restores the declared order of an axis whose values match", () => {
    const merged = mergeCva(block([prop({ name: "size", type: '"lg" | "default" | "sm"' })]), {
      button: spec,
    });
    expect(merged.props[0]?.type).toBe('"default" | "sm" | "lg"');
  });

  it("fills a missing default from defaultVariants", () => {
    const merged = mergeCva(block([prop({ name: "size", type: '"sm" | "default" | "lg"' })]), {
      button: spec,
    });
    expect(merged.props[0]?.defaultValue).toBe('"default"');
  });

  it("keeps a default the implementation already declared", () => {
    const merged = mergeCva(
      block([prop({ name: "size", type: '"sm" | "default" | "lg"', defaultValue: '"sm"' })]),
      { button: spec },
    );
    expect(merged.props[0]?.defaultValue).toBe('"sm"');
  });

  it("leaves a prop alone when it only shares a name with an axis", () => {
    // Tabs has a `size` of its own that the tabs-list cva map does not describe.
    const merged = mergeCva(block([prop({ name: "size", type: '"xs" | "sm" | "md"' })]), {
      list: spec,
    });
    expect(merged.props[0]?.type).toBe('"xs" | "sm" | "md"');
  });

  it("does not touch a prop that is not an axis", () => {
    const original = prop({ name: "loading", type: "boolean" });
    expect(mergeCva(block([original]), { button: spec }).props[0]).toEqual(original);
  });

  it("applies to compound parts", () => {
    const part = {
      ...block([prop({ name: "size", type: '"lg" | "sm" | "default"' })]),
      name: "X.Y",
    };
    const merged = mergeCva(block([], [part]), { button: spec });
    expect(merged.parts[0]?.props[0]?.type).toBe('"default" | "sm" | "lg"');
  });

  it("returns the block untouched with no cva maps", () => {
    const original = block([prop({ name: "size" })]);
    expect(mergeCva(original, {})).toBe(original);
  });
});
