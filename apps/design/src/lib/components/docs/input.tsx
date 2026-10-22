"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const TYPES = ["text", "email", "password", "search", "number"] as const;

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "field"
  );
}

/** Holds the typed value so clearable has something to clear. */
function LiveInput({
  initial,
  ...props
}: { initial: string } & React.ComponentProps<typeof Input>) {
  const [value, setValue] = React.useState(initial);
  return <Input {...props} onValueChange={setValue} value={value} />;
}

export function Playground({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : ["md"];

  const knobs: Knob[] = [
    { name: "size", type: "select", options: sizes, defaultValue: "md" },
    { name: "type", type: "select", options: TYPES, defaultValue: "text" },
    { name: "label", type: "text", defaultValue: "Work email" },
    { name: "placeholder", type: "text", defaultValue: "you@company.com" },
    { name: "description", type: "text", defaultValue: "" },
    {
      name: "error",
      type: "text",
      defaultValue: "",
      hint: "A message marks the field invalid and is read out.",
    },
    { name: "disabled", type: "boolean", defaultValue: false },
    { name: "readOnly", type: "boolean", defaultValue: false },
    { name: "clearable", type: "boolean", defaultValue: false },
    { name: "loading", type: "boolean", defaultValue: false },
    { name: "prefix", type: "boolean", defaultValue: false, hint: "Adds a leading icon." },
  ];

  return (
    <ComponentPlayground
      caption="Type in the field to see clearable. A label always comes with an id, which the types require."
      code={(v) => {
        const label = String(v.label);
        const imports = [{ names: ["Input"], from: "@nebutra/ui/primitives" }];
        if (v.prefix) imports.push({ names: ["MagnifyingGlass"], from: "@nebutra/icons" });
        return snippet({
          imports,
          body: jsx({
            name: "Input",
            defaults: { size: "md", type: "text" },
            props: {
              id: label ? slug(label) : undefined,
              label: label || undefined,
              size: String(v.size),
              type: String(v.type),
              placeholder: String(v.placeholder) || undefined,
              description: String(v.description) || undefined,
              error: String(v.error) || undefined,
              disabled: v.disabled,
              readOnly: v.readOnly,
              clearable: v.clearable,
              loading: v.loading,
              prefix: v.prefix ? raw("<MagnifyingGlass />") : undefined,
            },
          }),
        });
      }}
      knobs={knobs}
      render={(v) => {
        const label = String(v.label);
        const shared = {
          clearable: Boolean(v.clearable),
          disabled: Boolean(v.disabled),
          initial: "",
          loading: Boolean(v.loading),
          readOnly: Boolean(v.readOnly),
          size: v.size as never,
          type: String(v.type),
          ...present({
            description: String(v.description) || undefined,
            error: String(v.error) || undefined,
            placeholder: String(v.placeholder) || undefined,
            prefix: v.prefix ? <MagnifyingGlass /> : undefined,
          }),
        };
        return (
          <div className="w-72 max-w-full">
            {label ? (
              <LiveInput {...shared} id="playground-input" label={label} />
            ) : (
              <LiveInput {...shared} aria-label="Input" />
            )}
          </div>
        );
      }}
    />
  );
}

const COLUMNS = [
  { id: "default", label: "Default" },
  { id: "filled", label: "Filled" },
  { id: "disabled", label: "Disabled" },
  { id: "readonly", label: "Read-only" },
  { id: "invalid", label: "Invalid" },
  { id: "loading", label: "Loading" },
];

export function StatesMatrix({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : ["sm", "md", "lg"];
  const rows = sizes.map((size) => ({ id: size, label: size }));

  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      render={(size, column) => (
        <div className="w-44">
          <Input
            aria-label={`${size} ${column}`}
            disabled={column === "disabled"}
            loading={column === "loading"}
            placeholder="Project name"
            readOnly={column === "readonly"}
            size={size as never}
            {...(column === "default" || column === "loading" ? {} : { defaultValue: "acme-web" })}
            {...(column === "invalid" ? { error: "Name is taken" } : {})}
          />
        </div>
      )}
      rows={rows}
      rowsLabel="Size"
    />
  );
}
