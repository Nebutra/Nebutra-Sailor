import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type ApiBlock,
  type ApiExtractor,
  createApiExtractor,
  labelForPackage,
  packageOf,
} from "./api-docs";
import { COMPONENTS } from "./registry";
import { UI_SRC } from "./ui-source";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "__fixtures__", "api-fixture.tsx");
const appTsconfig = resolve(here, "../../../tsconfig.json");

const prop = (block: ApiBlock | null, name: string) => block?.props.find((p) => p.name === name);

describe("createApiExtractor — fixture", () => {
  let extractor: ApiExtractor;

  beforeAll(() => {
    extractor = createApiExtractor({
      roots: [fixture],
      tsconfigPath: appTsconfig,
      ownRoot: join(here, "__fixtures__"),
    });
  });

  it("returns null for exports that are not components or functions", () => {
    expect(extractor.extract(fixture, "NOT_EXPORTED_AS_COMPONENT")).toBeNull();
    expect(extractor.extract(fixture, "DoesNotExist")).toBeNull();
  });

  it("separates own props from props inherited from React's DOM types", () => {
    const block = extractor.extract(fixture, "FixtureButton");

    expect(block?.kind).toBe("component");
    expect(block?.description).toBe("A button used to test the extractor.");
    expect(block?.props.map((p) => p.name)).toEqual(
      expect.arrayContaining(["label", "variant", "loading", "radius", "tone", "size"]),
    );
    // onClick / disabled / className come from @types/react, not the fixture.
    expect(block?.props.map((p) => p.name)).not.toContain("onClick");
    const react = block?.inherited.find((g) => g.source === "React (HTML attributes)");
    expect(react?.props.map((p) => p.name)).toEqual(
      expect.arrayContaining(["onClick", "disabled"]),
    );
  });

  it("orders required props first, then alphabetically", () => {
    const names = extractor.extract(fixture, "FixtureButton")?.props.map((p) => p.name);
    expect(names?.[0]).toBe("label");
    expect(names?.slice(1)).toEqual([...(names?.slice(1) ?? [])].sort());
  });

  it("reads type, optionality and JSDoc", () => {
    const block = extractor.extract(fixture, "FixtureButton");

    expect(prop(block, "label")).toMatchObject({ required: true, type: "string" });
    expect(prop(block, "loading")).toMatchObject({
      required: false,
      type: "boolean",
      description: "Shows a spinner and blocks input.",
    });
  });

  it("drops null and undefined from a union of literals", () => {
    const variant = prop(extractor.extract(fixture, "FixtureButton"), "variant");
    expect(variant?.type).toBe('"solid" | "outline"');
  });

  it("falls back to the checker for mapped (cva-style) props, in declared order", () => {
    const density = extractor
      .extract(fixture, "FixtureVariants")
      ?.props.find((p) => p.name === "density");

    expect(density?.required).toBe(false);
    expect(density?.type).toBe('"compact" | "cozy"');
  });

  it("prints ReactNode as an alias, and leaves ref out of the table", () => {
    const block = extractor.extract(fixture, "FixtureButton");
    expect(prop(block, "icon")?.type).toBe("React.ReactNode");
    expect(prop(block, "ref")).toBeUndefined();
  });

  it("reads defaults from @default, then from destructuring", () => {
    const block = extractor.extract(fixture, "FixtureButton");

    expect(prop(block, "radius")?.defaultValue).toBe('"md"');
    expect(prop(block, "variant")?.defaultValue).toBe('"solid"');
    expect(prop(block, "loading")?.defaultValue).toBe("false");
    expect(prop(block, "size")?.defaultValue).toBe("3");
    expect(prop(block, "label")?.defaultValue).toBeNull();
  });

  it("reads defaults from a `const { … } = props` statement in the body", () => {
    const block = extractor.extract(fixture, "FixtureField");
    expect(prop(block, "tone")?.defaultValue).toBe('"a"');
  });

  it("flags deprecated props and keeps the message", () => {
    const tone = prop(extractor.extract(fixture, "FixtureButton"), "tone");
    expect(tone?.deprecated).toBe("Use `variant`.");
    expect(prop(extractor.extract(fixture, "FixtureButton"), "label")?.deprecated).toBeNull();
  });

  it("merges the members of a union of props and only requires what every member requires", () => {
    const block = extractor.extract(fixture, "FixtureField");

    expect(block?.props.map((p) => p.name)).toEqual(
      expect.arrayContaining(["label", "id", "tone"]),
    );
    // `label` is required by one union member and forbidden by the other.
    expect(prop(block, "label")?.required).toBe(false);
    expect(prop(block, "id")?.required).toBe(false);
  });

  it("extracts compound parts hung off the root", () => {
    const block = extractor.extract(fixture, "FixtureTable");

    expect(block?.props.map((p) => p.name)).toEqual(["striped"]);
    expect(block?.parts.map((p) => p.name)).toEqual(["FixtureTable.Part"]);
    expect(block?.parts[0]?.props.map((p) => p.name)).toEqual(["numeric"]);
  });

  it("describes a hook by signature and returned members", () => {
    const block = extractor.extract(fixture, "useFixtureThing");

    expect(block?.kind).toBe("function");
    expect(block?.signatures).toEqual([
      "(): { show: (text: string) => number; hide: () => undefined; }",
    ]);
    expect(block?.members.map((m) => m.name)).toEqual(["show", "hide"]);
    expect(block?.members[0]?.description).toBe("Shows the thing.");
  });
});

describe("package labels", () => {
  it("finds the package in a pnpm path", () => {
    expect(
      packageOf(
        "/r/node_modules/.pnpm/@radix-ui+react-dialog@1/node_modules/@radix-ui/react-dialog/dist/index.d.ts",
      ),
    ).toBe("@radix-ui/react-dialog");
    expect(packageOf("/r/node_modules/sonner/dist/index.d.ts")).toBe("sonner");
    expect(packageOf("/r/src/own.ts")).toBeNull();
  });

  it("names known packages the way a reader would", () => {
    expect(labelForPackage("@types/react")).toBe("React (HTML attributes)");
    expect(labelForPackage("next")).toBe("React (HTML attributes)");
    expect(labelForPackage("@radix-ui/react-dropdown-menu")).toBe("Radix Dropdown Menu");
    expect(labelForPackage("@base-ui/react")).toBe("Base UI");
    expect(labelForPackage("sonner")).toBe("Sonner");
    expect(labelForPackage("left-pad")).toBe("left-pad");
  });
});

// The fixture proves the extractor's rules. These prove the rules still hold
// against the real library, which is where a source change would break them.
describe("createApiExtractor — @nebutra/ui", () => {
  let extractor: ApiExtractor;
  const file = (entry: string) => resolve(UI_SRC, entry);

  beforeAll(() => {
    extractor = createApiExtractor({
      roots: ["primitives/button.tsx", "primitives/input.tsx", "primitives/table.tsx"].map(file),
      tsconfigPath: resolve(UI_SRC, "..", "tsconfig.json"),
      ownRoot: UI_SRC,
    });
  }, 60_000);

  it("reads Button's own props, including cva variant axes", () => {
    const block = extractor.extract(file("primitives/button.tsx"), "Button");
    const names = block?.props.map((p) => p.name) ?? [];

    expect(names).toEqual(
      expect.arrayContaining(["variant", "size", "loading", "prefix", "suffix"]),
    );
    expect(prop(block, "loading")?.description).toMatch(/spinner/i);
    expect(prop(block, "variant")?.type).toContain('"outline"');
  }, 60_000);

  it("reads Input's union props and its destructuring defaults", () => {
    const block = extractor.extract(file("primitives/input.tsx"), "Input");

    expect(block?.props.map((p) => p.name)).toEqual(
      expect.arrayContaining(["label", "error", "clearable", "size"]),
    );
    expect(prop(block, "size")?.defaultValue).toBe('"md"');
  }, 60_000);

  it("finds Table's compound parts and their numeric alignment prop", () => {
    const block = extractor.extract(file("primitives/table.tsx"), "Table");
    const parts = new Map(block?.parts.map((p) => [p.name, p]));

    expect(parts.has("Table.Head")).toBe(true);
    expect(parts.get("Table.Head")?.props.map((p) => p.name)).toContain("numeric");
    expect(parts.get("Table.Body")?.props.map((p) => p.name)).toEqual(
      expect.arrayContaining(["striped", "bordered", "interactive"]),
    );
  }, 60_000);

  it("registry entries all point at files the program can open", () => {
    // A registry typo would otherwise surface as an empty API table.
    for (const entry of COMPONENTS) expect(entry.entry).toMatch(/\.tsx?$/);
  });
});
