"use client";

import { ArrowRight, Plus } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { axis, axisDefault } from "../derived";

const FROM = "@nebutra/ui/primitives";

function axes(derived: DemoProps["derived"]) {
  const options = (group: string) => {
    const found = axis(derived, "button", group);
    return found.length > 0 ? found : [axisDefault(derived, "button", group) ?? "default"];
  };
  return {
    variant: options("variant"),
    size: options("size"),
    shape: options("shape"),
    defaults: {
      variant: axisDefault(derived, "button", "variant") ?? "default",
      size: axisDefault(derived, "button", "size") ?? "default",
      shape: axisDefault(derived, "button", "shape") ?? "default",
    },
  };
}

export function Playground({ derived }: DemoProps) {
  const a = axes(derived);

  const knobs: Knob[] = [
    { name: "variant", type: "select", options: a.variant, defaultValue: a.defaults.variant },
    { name: "size", type: "select", options: a.size, defaultValue: a.defaults.size },
    { name: "shape", type: "select", options: a.shape, defaultValue: a.defaults.shape },
    { name: "children", label: "label", type: "text", defaultValue: "Deploy" },
    { name: "loading", type: "boolean", defaultValue: false },
    { name: "disabled", type: "boolean", defaultValue: false },
    { name: "prefix", type: "boolean", defaultValue: false, hint: "Adds a leading icon." },
    { name: "suffix", type: "boolean", defaultValue: false, hint: "Adds a trailing icon." },
  ];

  return (
    <ComponentPlayground
      caption="A square or circle shape, or size icon, drops the label and renders the icon alone, so the code names it with aria-label."
      code={(v) => {
        const iconOnly = v.size === "icon" || v.shape === "square" || v.shape === "circle";
        const label = String(v.children);
        const iconNames = iconOnly
          ? ["Plus"]
          : [v.prefix ? "Plus" : "", v.suffix ? "ArrowRight" : ""].filter(Boolean);
        const imports = [{ names: ["Button"], from: FROM }];
        if (iconNames.length > 0) imports.push({ names: iconNames, from: "@nebutra/icons" });

        return snippet({
          imports,
          body: jsx({
            name: "Button",
            defaults: a.defaults,
            props: {
              variant: String(v.variant),
              size: String(v.size),
              shape: String(v.shape),
              "aria-label": iconOnly ? label : undefined,
              loading: v.loading,
              disabled: v.disabled,
              prefix: !iconOnly && v.prefix ? raw("<Plus />") : undefined,
              suffix: !iconOnly && v.suffix ? raw("<ArrowRight />") : undefined,
            },
            children: iconOnly ? ["<Plus />"] : label,
          }),
        });
      }}
      knobs={knobs}
      render={(v) => {
        const iconOnly = v.size === "icon" || v.shape === "square" || v.shape === "circle";
        const label = String(v.children);
        return (
          <Button
            aria-label={iconOnly ? label : undefined}
            disabled={Boolean(v.disabled)}
            loading={Boolean(v.loading)}
            prefix={!iconOnly && v.prefix ? <Plus /> : undefined}
            shape={v.shape as never}
            size={v.size as never}
            suffix={!iconOnly && v.suffix ? <ArrowRight /> : undefined}
            variant={v.variant as never}
          >
            {iconOnly ? <Plus /> : label}
          </Button>
        );
      }}
    />
  );
}

const COLUMNS = [
  { id: "default", label: "Default" },
  { id: "disabled", label: "Disabled" },
  { id: "loading", label: "Loading" },
  { id: "prefix", label: "With icon" },
];

export function StatesMatrix({ derived }: DemoProps) {
  const a = axes(derived);
  const rows = a.size.filter((size) => size !== "icon").map((size) => ({ id: size, label: size }));

  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      render={(size, column) => (
        <Button
          disabled={column === "disabled"}
          loading={column === "loading"}
          prefix={column === "prefix" ? <Plus /> : undefined}
          size={size as never}
        >
          Deploy
        </Button>
      )}
      rows={rows}
      rowsLabel="Size"
    />
  );
}
