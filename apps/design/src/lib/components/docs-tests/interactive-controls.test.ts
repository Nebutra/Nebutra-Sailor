import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type { Knob, KnobValues } from "@/components/component-playground";
import type { DemoProps } from "../derived";

const NAMES = [
  "textarea",
  "combobox",
  "checkbox",
  "label",
  "slider",
  "toggle",
  "radio-group",
  "switch",
  "field",
  "tooltip",
  "popover",
  "dropdown-menu",
  "tabs",
  "avatar",
] as const;

const DERIVED: DemoProps["derived"] = {
  axes: {},
  cva: {
    list: {
      name: "tabsListVariants",
      file: "packages/design/ui/src/primitives/tabs.tsx",
      variants: { variant: ["default", "line"], shape: ["default", "pill"] },
      defaults: { variant: "default", shape: "default" },
    },
  },
  sourceFile: "packages/design/ui/src/primitives/example.tsx",
  storyFile: null,
};

interface Element {
  type: unknown;
  props: Record<string, unknown>;
}

interface PlaygroundProps {
  knobs: Knob[];
  code: (values: KnobValues) => string;
  render: (values: KnobValues) => Element;
}

interface MatrixProps {
  rows: { id: string }[];
  columns: { id: string }[];
  render: (row: string, column: string) => Element;
}

interface DocsModule {
  Playground: (props: DemoProps) => { props: PlaygroundProps };
  StatesMatrix: (props: DemoProps) => { props: MatrixProps };
}

// Evaluate only the docs and their pure helpers. UI exports are opaque element
// types, so these checks do not need built workspace bundles or shared probes.
function harness() {
  let nextId = 0;
  const updates: unknown[] = [];
  const elements: Element[] = [];
  const cache = new Map<string, unknown>();
  const element = (type: unknown, props: Record<string, unknown>): Element => {
    const result = { type, props };
    elements.push(result);
    return result;
  };
  const react = {
    useId: () => `docs-${nextId++}`,
    useState: (initial: unknown) => [initial, (value: unknown) => updates.push(value)],
    createElement: (type: unknown, props: Record<string, unknown>, ...children: unknown[]) =>
      element(type, { ...props, ...(children.length ? { children } : {}) }),
  };
  const primitives = new Proxy(
    {},
    {
      get: (_, key) => (key === "Switch" ? { Control: "Switch.Control" } : key),
    },
  );

  function evaluate(source: string, filename: string) {
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: filename,
      reportDiagnostics: true,
    });
    expect(output.diagnostics, filename).toEqual([]);
    const exports: Record<string, unknown> = {};
    runInNewContext(
      output.outputText,
      {
        exports,
        require: (specifier: string): unknown => {
          if (specifier === "react") return react;
          if (specifier === "react/jsx-runtime") return { jsx: element, jsxs: element };
          if (specifier === "@nebutra/ui/primitives") return primitives;
          if (specifier === "@/components/component-playground")
            return { ComponentPlayground: "Playground" };
          if (specifier === "@/components/component-states-matrix")
            return { ComponentStatesMatrix: "Matrix" };
          if (specifier.startsWith(".")) {
            const base = resolve(dirname(filename), specifier);
            return load(`${base}.ts`);
          }
          throw new Error(`Unexpected dependency: ${specifier}`);
        },
      },
      { filename },
    );
    return exports;
  }

  function load(filename: string): unknown {
    const cached = cache.get(filename);
    if (cached) return cached;
    const exports = evaluate(readFileSync(filename, "utf8"), filename);
    cache.set(filename, exports);
    return exports;
  }

  function expand(node: unknown): Element[] {
    if (node == null || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(expand);
    const value = node as Element;
    if (!value.props) return [];
    if (typeof value.type === "function") return expand(value.type(value.props));
    return [value, ...expand(value.props.children)];
  }

  return {
    docs: (name: string) =>
      load(resolve(import.meta.dirname, "../docs", `${name}.tsx`)) as DocsModule,
    evaluate,
    expand,
    updates,
    elements,
  };
}

function playground(h: ReturnType<typeof harness>, name: string) {
  const { props } = h.docs(name).Playground({ derived: DERIVED });
  const values = Object.fromEntries(props.knobs.map((knob) => [knob.name, knob.defaultValue]));
  return { ...props, values };
}

describe("interactive control documentation", () => {
  it.each(NAMES)("%s produces executable, self-contained code for each knob option", (name) => {
    const h = harness();
    const page = playground(h, name);
    const samples = [page.values];
    for (const knob of page.knobs) {
      const choices =
        knob.type === "select"
          ? knob.options
          : knob.type === "boolean"
            ? [true, false]
            : ['Use {value} < 3 and "quotes"'];
      for (const value of choices) samples.push({ ...page.values, [knob.name]: value });
    }
    for (const [index, values] of samples.entries()) {
      const code = page.code(values);
      expect(code).toContain('from "@nebutra/ui/primitives"');
      const exports = h.evaluate(code, `${name}-snippet-${index}.tsx`);
      for (const value of Object.values(exports)) {
        if (typeof value === "function") value();
      }
      expect(code).not.toMatch(/(?:id|htmlFor)="playground-/);
    }
  });

  it("writes explicit false when the slider readout is hidden", () => {
    const page = playground(harness(), "slider");
    expect(page.code({ ...page.values, showValue: false })).toContain("showValue={false}");
  });

  it("keeps the empty combobox snippet valid under noImplicitAny", () => {
    const page = playground(harness(), "combobox");
    const code = page.code({ ...page.values, empty: true });
    const filename = resolve(import.meta.dirname, "virtual-empty-combobox.tsx");
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.Preserve,
      types: [],
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = (file) => (file === filename ? code : read(file));
    host.fileExists = (file) => file === filename || exists(file);
    const program = ts.createProgram([filename], options, host);
    const implicitArrays = ts
      .getPreEmitDiagnostics(program)
      .filter(
        (diagnostic) =>
          diagnostic.file?.fileName === filename && [7005, 7034].includes(diagnostic.code),
      );
    expect(
      implicitArrays.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
    ).toEqual([]);
  });

  it("keeps long tooltip triggers constrained in the copied example", () => {
    const page = playground(harness(), "tooltip");
    expect(page.code(page.values)).toContain(
      'className="max-w-full whitespace-normal break-words"',
    );
  });

  it("derives the available sizes, colors, and tab variants from supplied metadata", () => {
    const h = harness();
    const derived = {
      ...DERIVED,
      axes: { size: ["compact", "roomy"], color: ["neutral", "success"] },
    };
    for (const name of ["textarea", "combobox", "toggle", "switch", "avatar", "tabs"]) {
      const knobs = h.docs(name).Playground({ derived }).props.knobs;
      expect(knobs.find((knob) => knob.name === "size")).toMatchObject({
        options: derived.axes.size,
      });
    }
    const toggle = h.docs("toggle").Playground({ derived }).props.knobs;
    expect(toggle.find((knob) => knob.name === "color")).toMatchObject({
      options: derived.axes.color,
    });
    const tabs = h.docs("tabs").Playground({ derived }).props.knobs;
    expect(tabs.find((knob) => knob.name === "variant")).toMatchObject({
      options: ["default", "line"],
    });
  });

  it("keeps overlay matrices closed until their own trigger is used", () => {
    const h = harness();
    for (const name of ["tooltip", "popover", "dropdown-menu", "combobox"]) {
      const matrix = h.docs(name).StatesMatrix({ derived: DERIVED }).props;
      for (const row of matrix.rows) {
        for (const column of matrix.columns) {
          const nodes = h.expand(matrix.render(row.id, column.id));
          const overlays = nodes.filter((node) =>
            ["Tooltip", "Popover", "DropdownMenu", "Combobox"].includes(String(node.type)),
          );
          expect(overlays.length, name).toBeGreaterThan(0);
          for (const node of overlays) {
            expect(node.props.open).not.toBe(true);
            expect(node.props.defaultOpen).not.toBe(true);
          }
        }
      }
    }
  });

  it("generates distinct associations for repeated light and dark previews", () => {
    const h = harness();
    for (const name of ["label", "field", "popover", "textarea"]) {
      const ids: unknown[] = [];
      for (let index = 0; index < 2; index++) {
        const page = playground(h, name);
        const nodes = h.expand(page.render(page.values));
        const control = nodes.find((node) => node.type === "Input" || node.type === "Textarea");
        expect(control, name).toBeDefined();
        ids.push(control?.props.id);
        if (name === "label" || name === "field") {
          const owner = nodes.find((node) => node.type === "Label" || node.type === "Field");
          expect(owner?.props.htmlFor).toBe(control?.props.id);
        }
      }
      expect(ids[0], name).not.toBe(ids[1]);
    }
  });

  it("wires menu actions and checkbox changes to local state setters", () => {
    const h = harness();
    const page = playground(h, "dropdown-menu");
    const nodes = h.expand(page.render(page.values));
    const rename = nodes.find((node) => node.type === "DropdownMenuItem");
    const checkbox = nodes.find((node) => node.type === "DropdownMenuCheckboxItem");
    (rename?.props.onClick as () => void)();
    (checkbox?.props.onCheckedChange as (checked: boolean) => void)(false);
    expect(h.updates).toEqual(["Rename selected.", false]);
    const withoutCheckbox = page.code({ ...page.values, showCheckbox: false });
    expect(withoutCheckbox).not.toContain("setChecked");
    expect(withoutCheckbox).not.toContain("DropdownMenuCheckboxItem");
  });
});
