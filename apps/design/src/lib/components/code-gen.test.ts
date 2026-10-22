import { describe, expect, it } from "vitest";
import { importLine, jsx, raw, snippet } from "./code-gen";

describe("jsx", () => {
  it("self-closes an element with no children", () => {
    expect(jsx({ name: "Input", props: {} })).toBe("<Input />");
  });

  it("writes strings, numbers and bare booleans", () => {
    expect(jsx({ name: "Input", props: { label: "Email", maxLength: 40, disabled: true } })).toBe(
      '<Input label="Email" maxLength={40} disabled />',
    );
  });

  it("omits explicit defaults, null and undefined", () => {
    expect(
      jsx({
        name: "Button",
        props: { loading: false, size: undefined, shape: null },
        defaults: { loading: false },
        children: "Go",
      }),
    ).toBe("<Button>Go</Button>");
  });

  it("keeps false when it overrides a true default", () => {
    expect(
      jsx({
        name: "DialogContent",
        props: { showCloseButton: false },
        defaults: { showCloseButton: true },
      }),
    ).toBe("<DialogContent showCloseButton={false} />");
  });

  it("preserves entities and whitespace in editable labels and attributes", () => {
    const text = "A &amp; B\nC";
    expect(jsx({ name: "Label", props: {}, children: text })).toBe(
      `<Label>{${JSON.stringify(text)}}</Label>`,
    );
    expect(jsx({ name: "Input", props: { placeholder: text } })).toBe(
      `<Input placeholder={${JSON.stringify(text)}} />`,
    );
  });

  it("omits a prop that equals its default, so the snippet is what a reader would write", () => {
    expect(
      jsx({
        name: "Button",
        props: { variant: "default", size: "lg" },
        defaults: { variant: "default", size: "default" },
        children: "Deploy",
      }),
    ).toBe('<Button size="lg">Deploy</Button>');
  });

  it("writes raw expressions inside braces", () => {
    expect(jsx({ name: "Button", props: { prefix: raw("<Plus />") }, children: "New" })).toBe(
      "<Button prefix={<Plus />}>New</Button>",
    );
  });

  it("quotes a string attribute that contains a double quote as an expression", () => {
    expect(jsx({ name: "Input", props: { placeholder: 'Say "hi"' } })).toBe(
      '<Input placeholder={"Say \\"hi\\""} />',
    );
  });

  it("wraps text that JSX would read as syntax", () => {
    expect(jsx({ name: "Button", props: {}, children: "Use {value} < 3" })).toBe(
      '<Button>{"Use {value} < 3"}</Button>',
    );
  });

  it("breaks props onto their own lines once the line is too long", () => {
    const out = jsx({
      name: "Input",
      props: {
        label: "Work email address",
        placeholder: "you@company.example",
        description: "We only use this to send the receipt.",
      },
    });

    expect(out).toBe(
      [
        "<Input",
        '  label="Work email address"',
        '  placeholder="you@company.example"',
        '  description="We only use this to send the receipt."',
        "/>",
      ].join("\n"),
    );
  });

  it("indents multi-line children one level", () => {
    const out = jsx({
      name: "Dialog",
      props: {},
      children: ["<DialogTrigger>Open</DialogTrigger>", "<DialogContent>…</DialogContent>"],
    });

    expect(out).toBe(
      [
        "<Dialog>",
        "  <DialogTrigger>Open</DialogTrigger>",
        "  <DialogContent>…</DialogContent>",
        "</Dialog>",
      ].join("\n"),
    );
  });

  it("keeps the attribute order the caller gave", () => {
    expect(jsx({ name: "A", props: { b: 1, a: 2 } })).toBe("<A b={1} a={2} />");
  });
});

describe("expression children", () => {
  it("writes a lone expression inline, braced", () => {
    expect(jsx({ name: "Table.Cell", props: {}, children: raw("row.region") })).toBe(
      "<Table.Cell>{row.region}</Table.Cell>",
    );
  });
});

describe("importLine", () => {
  it("breaks a long import onto one name per line", () => {
    const names = ["Button", "Dialog", "DialogClose", "DialogContent", "DialogDescription"];
    expect(importLine(names, "@nebutra/ui/primitives")).toBe(
      [
        "import {",
        "  Button,",
        "  Dialog,",
        "  DialogClose,",
        "  DialogContent,",
        "  DialogDescription,",
        '} from "@nebutra/ui/primitives";',
      ].join("\n"),
    );
  });

  it("lists names in the order given, sorted case-insensitively", () => {
    expect(importLine(["Select", "Button"], "@nebutra/ui/primitives")).toBe(
      'import { Button, Select } from "@nebutra/ui/primitives";',
    );
  });

  it("drops duplicates", () => {
    expect(importLine(["Button", "Button"], "x")).toBe('import { Button } from "x";');
  });
});

describe("snippet", () => {
  it("joins imports, a blank line and the body", () => {
    expect(
      snippet({
        imports: [{ names: ["Button"], from: "@nebutra/ui/primitives" }],
        body: "<Button>Deploy</Button>",
      }),
    ).toBe('import { Button } from "@nebutra/ui/primitives";\n\n<Button>Deploy</Button>');
  });

  it("merges imports from the same module", () => {
    expect(
      snippet({
        imports: [
          { names: ["Button"], from: "@nebutra/ui/primitives" },
          { names: ["Input"], from: "@nebutra/ui/primitives" },
          { names: ["Plus"], from: "@nebutra/icons" },
        ],
        body: "x",
      }),
    ).toBe(
      [
        'import { Plus } from "@nebutra/icons";',
        'import { Button, Input } from "@nebutra/ui/primitives";',
        "",
        "x",
      ].join("\n"),
    );
  });
});
