// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Knob, KnobValues } from "@/components/component-playground";
import type { DemoProps } from "../derived";

const runtimeRequire = createRequire(import.meta.url);
const DERIVED: DemoProps["derived"] = {
  axes: { tone: ["message", "success", "warning", "error"] },
  cva: {},
  sourceFile: "primitives/toaster.tsx",
  storyFile: null,
};

interface PlaygroundProps {
  knobs: Knob[];
  code: (values: KnobValues) => string;
  render: (values: KnobValues) => React.ReactElement;
}

interface DocsModule {
  Playground: (props: DemoProps) => React.ReactElement<PlaygroundProps>;
}

function harness() {
  const notifications = vi.fn();
  const methods = Object.fromEntries(
    ["message", "success", "warning", "error"].map((tone) => [
      tone,
      (...args: unknown[]) => notifications(tone, ...args),
    ]),
  );
  const Table = Object.assign(
    (props: React.HTMLAttributes<HTMLTableElement>) => React.createElement("table", props),
    {
      Body: "tbody",
      Caption: "caption",
      Cell: "td",
      Head: "th",
      Header: "thead",
      Row: "tr",
    },
  );
  const primitives = {
    Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
      React.createElement("button", { type: "button", ...props }),
    Toaster: () => null,
    useToasts: () => methods,
    Table,
  };
  const cache = new Map<string, Record<string, unknown>>();

  function evaluate(source: string, filename: string): Record<string, unknown> {
    const module = { exports: {} as Record<string, unknown> };
    const output = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    runInNewContext(
      output,
      {
        module,
        exports: module.exports,
        require: (specifier: string): unknown => {
          if (specifier === "@nebutra/ui/primitives") return primitives;
          if (specifier === "@nebutra/tokens")
            return { useTheme: () => ({ resolvedTheme: "light" }) };
          if (specifier === "@/components/component-playground")
            return { ComponentPlayground: "Playground" };
          if (specifier === "@/components/component-states-matrix")
            return { ComponentStatesMatrix: "Matrix" };
          if (specifier.startsWith(".")) {
            const file = resolve(dirname(filename), `${specifier}.ts`);
            if (!cache.has(file)) cache.set(file, evaluate(readFileSync(file, "utf8"), file));
            return cache.get(file);
          }
          return runtimeRequire(specifier);
        },
      },
      { filename },
    );
    return module.exports;
  }

  function playground(name: "table" | "toast") {
    const file = resolve(import.meta.dirname, "../docs", `${name}.tsx`);
    const module = evaluate(readFileSync(file, "utf8"), file) as unknown as DocsModule;
    const props = module.Playground({ derived: DERIVED }).props;
    const values = Object.fromEntries(props.knobs.map((knob) => [knob.name, knob.defaultValue]));
    return { ...props, values };
  }

  function component(code: string): React.ComponentType {
    const exports = evaluate(code, "copied-toast.tsx");
    const example = Object.values(exports).find((value) => typeof value === "function");
    expect(example, "Copied toast must export a component").toBeTypeOf("function");
    return example as React.ComponentType;
  }

  return { playground, evaluate, component, notifications };
}

function variants(page: ReturnType<ReturnType<typeof harness>["playground"]>) {
  if (page.knobs.some((knob) => knob.name === "tone")) {
    const tones = DERIVED.axes.tone ?? [];
    return tones.flatMap((tone) =>
      [false, true].flatMap((undo) =>
        [false, true].flatMap((preserve) =>
          ["", 'Release <candidate> & {team} "quoted"\nNext &amp; line'].map((text) => ({
            ...page.values,
            tone,
            undo,
            preserve,
            text,
            description: text,
          })),
        ),
      ),
    );
  }
  return page.knobs.reduce<KnobValues[]>(
    (samples, knob) =>
      samples.flatMap((values) => [false, true].map((v) => ({ ...values, [knob.name]: v }))),
    [page.values],
  );
}

afterEach(cleanup);

describe("table and toast copied examples", () => {
  it("evaluates every table variant with its own row data", () => {
    const h = harness();
    for (const values of variants(h.playground("table"))) {
      expect(() =>
        h.evaluate(h.playground("table").code(values), "copied-table.tsx"),
      ).not.toThrow();
    }
  });

  it("keeps toast emission behind a client component event handler, including SSR", () => {
    const h = harness();
    const page = h.playground("toast");
    const code = page.code(page.values);
    const Example = h.component(code);
    expect(code.startsWith('"use client";')).toBe(true);
    expect(h.notifications).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(React.createElement(Example))).toContain("Show toast");
    expect(h.notifications).not.toHaveBeenCalled();
    render(React.createElement(Example));
    expect(h.notifications).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
    expect(h.notifications).toHaveBeenCalledTimes(1);
    expect(h.notifications).toHaveBeenCalledWith("success", "Deployment promoted");
  });

  it.each([
    "preview",
    "copied code",
  ] as const)("restores a local project through Undo in %s", (target) => {
    const h = harness();
    const page = h.playground("toast");
    const values = { ...page.values, tone: "message", undo: true, text: "Project archived" };
    render(
      target === "preview"
        ? page.render(values)
        : React.createElement(h.component(page.code(values))),
    );
    expect(screen.getByRole("status").textContent).toContain("active");
    fireEvent.click(screen.getByRole("button", { name: "Archive project" }));
    expect(screen.getByRole("status").textContent).toContain("archived");
    const [tone, message] = h.notifications.mock.lastCall ?? [];
    expect(tone).toBe("message");
    expect(message).toMatchObject({ text: "Project archived" });
    const onUndoAction = (message as { onUndoAction?: () => void }).onUndoAction;
    expect(onUndoAction).toBeTypeOf("function");
    act(() => onUndoAction?.());
    expect(screen.getByRole("status").textContent).toContain("active");
  });

  it("typechecks every table and toast variant against the public component types", () => {
    const h = harness();
    const files = new Map<string, string>();
    for (const name of ["table", "toast"] as const) {
      const page = h.playground(name);
      for (const [index, values] of variants(page).entries()) {
        files.set(resolve(import.meta.dirname, `virtual-${name}-${index}.tsx`), page.code(values));
      }
    }
    // Virtual files prevent concurrent suites from sharing probe files on disk.
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = (file) => files.get(file) ?? read(file);
    host.fileExists = (file) => files.has(file) || exists(file);
    const program = ts.createProgram([...files.keys()], options, host);
    const errors = ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.file && files.has(d.file.fileName));
    expect([
      ...new Set(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))),
    ]).toEqual([]);
  }, 30_000);
});
