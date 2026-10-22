import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import type { ReactElement } from "react";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type { Knob, KnobValues } from "@/components/component-playground";
import type { DemoProps, Derived } from "../derived";
import { COMPONENTS } from "../registry";
import { findConstArray, findCva, findObjectKeys, findUnion, UI_SRC } from "../ui-source";

const runtimeRequire = createRequire(import.meta.url);
const sourceModules = new Map<string, Record<string, unknown>>();
const componentStubs = new Proxy(
  {},
  { get: (_target, name) => (name === "__esModule" ? true : String(name)) },
);

// Compile the client modules in isolation: this Node suite exercises their
// code generators and source axes without changing Next's jsx:preserve config.
function loadSource(file: string): Record<string, unknown> {
  const cached = sourceModules.get(file);
  if (cached) return cached;
  const module = { exports: {} as Record<string, unknown> };
  sourceModules.set(file, module.exports);
  const output = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  runInNewContext(
    output,
    {
      exports: module.exports,
      module,
      require: (specifier: string) => {
        if (specifier.startsWith("@nebutra/") || specifier.startsWith("@/components/")) {
          return componentStubs;
        }
        if (specifier.startsWith(".")) {
          const base = resolve(dirname(file), specifier);
          const local = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
          if (!local) throw new Error(`Unresolved local import: ${specifier}`);
          return loadSource(local);
        }
        return runtimeRequire(specifier);
      },
    },
    { filename: file },
  );
  return module.exports;
}

const SLUGS = [
  "badge",
  "animate-in",
  "card",
  "progress",
  "page-header",
  "status-dot",
  "empty-state",
  "separator",
  "loading-state",
  "alert",
  "skeleton",
  "spinner",
  "kbd",
  "error-state",
] as const;

type Slug = (typeof SLUGS)[number];
interface Harness {
  knobs: Knob[];
  code: (values: KnobValues) => string;
  render: (
    values: KnobValues,
  ) => ReactElement<{ children?: ReactElement<Record<string, unknown>> }>;
}

function derivedFor(slug: Slug): Derived {
  const entry = COMPONENTS.find((component) => component.slug === slug);
  if (!entry) throw new Error(`Missing component: ${slug}`);
  const cva: Derived["cva"] = {};
  for (const request of entry.cva ?? []) {
    const spec = findCva(join(UI_SRC, request.file ?? entry.entry), request.name);
    if (!spec) throw new Error(`Missing cva: ${request.name}`);
    cva[request.as] = spec;
  }
  const axes: Derived["axes"] = {};
  for (const request of entry.axes ?? []) {
    const file = join(UI_SRC, request.file);
    const values =
      request.kind === "union"
        ? findUnion(file, request.name)
        : request.kind === "constArray"
          ? findConstArray(file, request.name)
          : findObjectKeys(file, request.name);
    if (!values?.length) throw new Error(`Missing source axis: ${request.name}`);
    axes[request.as] = values;
  }
  return { cva, axes, sourceFile: entry.entry, storyFile: null };
}

async function playground(slug: Slug) {
  const module = loadSource(resolve(__dirname, "../docs", `${slug}.tsx`)) as {
    Playground: (props: DemoProps) => ReactElement<Harness>;
    StatesMatrix: (props: DemoProps) => ReactElement;
  };
  const derived = derivedFor(slug);
  const harness = module.Playground({ derived }).props;
  const values = Object.fromEntries(harness.knobs.map((knob) => [knob.name, knob.defaultValue]));
  return { ...harness, values, matrix: module.StatesMatrix, derived };
}

function expectValidTsx(code: string) {
  const result = ts.transpileModule(code, {
    compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
    fileName: "example.tsx",
  });
  expect(result.diagnostics?.map((diagnostic) => diagnostic.messageText)).toEqual([]);
  expect(code).toMatch(/import \{/);
}

describe("passive component playground contracts", () => {
  it.each(SLUGS)("%s emits valid JSX for every knob choice", async (slug) => {
    const harness = await playground(slug);
    expectValidTsx(harness.code(harness.values));
    expect(harness.matrix({ derived: harness.derived })).toBeTruthy();

    for (const knob of harness.knobs) {
      const choices =
        knob.type === "select"
          ? knob.options
          : knob.type === "boolean"
            ? [true, false]
            : ["", 'Release <candidate> & {team} "quoted"\nNext &amp; line'];
      for (const value of choices) {
        const code = harness.code({ ...harness.values, [knob.name]: value });
        expectValidTsx(code);
        if (value !== knob.defaultValue) {
          expect(code, `${slug}.${knob.name} must affect copied code`).not.toBe(
            harness.code(harness.values),
          );
        }
      }
    }
  });

  it("does not offer disabled or loading controls for Badge", async () => {
    const harness = await playground("badge");
    expect(harness.knobs.map((knob) => knob.name)).not.toContain("disabled");
    expect(harness.knobs.map((knob) => knob.name)).not.toContain("loading");
    const size = harness.knobs.find((knob) => knob.name === "size");
    expect(size?.type === "select" && size.options).toEqual(
      harness.derived.cva.badge?.variants.size,
    );
  });

  it("includes the state and Button needed to replay an entrance", async () => {
    const harness = await playground("animate-in");
    const code = harness.code(harness.values);
    expect(code).toContain('"use client"');
    expect(code).toContain("useState");
    expect(code).toContain("key={run}");
    expect(code).toContain("setRun");
    expect(code).toContain("Replay");
    expect(code).not.toContain("motion.div");
    expect(code).not.toMatch(/preset="emerge"/);
  });

  it("uses explicit null for indeterminate Progress", async () => {
    const harness = await playground("progress");
    expect(harness.code({ ...harness.values, indeterminate: true })).toContain("value={null}");
  });

  it("keeps false-valued Skeleton props in copyable code", async () => {
    const harness = await playground("skeleton");
    const code = harness.code({ ...harness.values, show: false, animated: false });
    expect(code).toContain("show={false}");
    expect(code).toContain("animated={false}");
    expect(code).not.toContain("isLoaded");
  });

  it("provides state for dismissing an Alert and retrying an ErrorState", async () => {
    const alert = await playground("alert");
    const alertCode = alert.code({ ...alert.values, close: true });
    expect(alertCode).toContain("onClose");
    expect(alertCode).toContain("useState");
    expect(alertCode).toContain("Restore alert");

    const error = await playground("error-state");
    const errorCode = error.code({ ...error.values, retry: true });
    expect(errorCode).toContain("onRetry");
    expect(errorCode).toContain("useState");
    expect(errorCode).toContain("setRetries");
  });

  it("never advertises deprecated Spinner variants as visual choices", async () => {
    const harness = await playground("spinner");
    expect(harness.knobs.map((knob) => knob.name)).not.toContain("variant");
    expect(harness.code({ ...harness.values, tone: "inverse" })).toContain("bg-primary");
  });

  it("lets Spinner infer decorative mode when its label is cleared", async () => {
    const harness = await playground("spinner");
    const frame = harness.render({ ...harness.values, label: "", decorative: false });
    expect(frame.props.children?.props.decorative).toBeUndefined();
  });
});
