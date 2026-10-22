"use client";

import { Globe } from "@nebutra/icons";
import { Select } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const REGIONS = [
  { value: "iad1", label: "Washington, D.C. (iad1)" },
  { value: "sfo1", label: "San Francisco (sfo1)" },
  { value: "fra1", label: "Frankfurt (fra1)" },
  { value: "syd1", label: "Sydney (syd1), at capacity", disabled: true },
] as const;

const OPTIONS_CONST = `const regions = [
  { value: "iad1", label: "Washington, D.C. (iad1)" },
  { value: "sfo1", label: "San Francisco (sfo1)" },
  { value: "fra1", label: "Frankfurt (fra1)" },
  { value: "syd1", label: "Sydney (syd1), at capacity", disabled: true },
];`;

function sizesOf(derived: DemoProps["derived"]) {
  return derived.axes.size?.length ? derived.axes.size : ["medium"];
}

export function Playground({ derived }: DemoProps) {
  const sizes = sizesOf(derived);
  const fallback = sizes.includes("medium") ? "medium" : (sizes[0] ?? "medium");

  const knobs: Knob[] = [
    { name: "size", type: "select", options: sizes, defaultValue: fallback },
    { name: "label", type: "text", defaultValue: "Region" },
    { name: "placeholder", type: "text", defaultValue: "Choose a region" },
    { name: "error", type: "text", defaultValue: "", hint: "A message marks the trigger invalid." },
    { name: "disabled", type: "boolean", defaultValue: false },
    { name: "prefix", type: "boolean", defaultValue: false, hint: "Adds a leading icon." },
  ];

  return (
    <ComponentPlayground
      caption="Open the list: it is a themed listbox, so it follows light and dark with the page."
      code={(v) => {
        const imports = [{ names: ["Select"], from: "@nebutra/ui/primitives" }];
        if (v.prefix) imports.push({ names: ["Globe"], from: "@nebutra/icons" });
        const body = jsx({
          name: "Select",
          defaults: { size: fallback },
          props: {
            label: String(v.label) || undefined,
            options: raw("regions"),
            placeholder: String(v.placeholder) || undefined,
            size: String(v.size),
            error: String(v.error) || undefined,
            disabled: v.disabled,
            prefix: v.prefix ? raw("<Globe />") : undefined,
          },
        });
        return snippet({ imports, body: `${OPTIONS_CONST}\n\n${body}` });
      }}
      knobs={knobs}
      render={(v) => (
        <div className="w-72 max-w-full">
          <Select
            disabled={Boolean(v.disabled)}
            options={REGIONS}
            size={v.size as never}
            {...present({
              error: String(v.error) || undefined,
              label: String(v.label) || undefined,
              placeholder: String(v.placeholder) || undefined,
              prefix: v.prefix ? <Globe /> : undefined,
            })}
          />
        </div>
      )}
    />
  );
}

const COLUMNS = [
  { id: "default", label: "Default" },
  { id: "selected", label: "Selected" },
  { id: "disabled", label: "Disabled" },
  { id: "invalid", label: "Invalid" },
  { id: "prefix", label: "With icon" },
];

export function StatesMatrix({ derived }: DemoProps) {
  const rows = sizesOf(derived).map((size) => ({ id: size, label: size }));

  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      render={(size, column) => (
        <div className="w-44">
          <Select
            aria-label={`${size} ${column}`}
            disabled={column === "disabled"}
            options={REGIONS}
            placeholder="Region"
            size={size as never}
            {...present({
              defaultValue: column === "selected" ? "fra1" : undefined,
              error: column === "invalid" ? "Pick a region" : undefined,
              prefix: column === "prefix" ? <Globe /> : undefined,
            })}
          />
        </div>
      )}
      rows={rows}
      rowsLabel="Size"
    />
  );
}
