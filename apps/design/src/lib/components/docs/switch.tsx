"use client";

import { Switch } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

function sizesOf({ axes }: DemoProps["derived"]) {
  return axes.size?.length ? axes.size : ["small", "medium", "large"];
}

export function Playground({ derived }: DemoProps) {
  const sizes = sizesOf(derived);
  const knobs: Knob[] = [
    {
      name: "size",
      type: "select",
      options: sizes,
      defaultValue: sizes.includes("medium") ? "medium" : (sizes[0] ?? "medium"),
    },
    { name: "defaultValue", type: "select", options: ["list", "grid"], defaultValue: "list" },
    { name: "listLabel", type: "text", defaultValue: "List" },
    { name: "gridLabel", type: "text", defaultValue: "Grid" },
    { name: "disableGrid", type: "boolean", defaultValue: false },
    { name: "disabled", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Switch is a segmented radio selector with string values. Its two options share an automatically generated form name."
      code={(v) =>
        snippet({
          imports: [{ names: ["Switch"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "div",
            props: { className: "max-w-full overflow-x-auto" },
            children: [
              jsx({
                name: "Switch",
                defaults: { size: "medium", disabled: false },
                props: {
                  "aria-label": "View",
                  size: String(v.size),
                  defaultValue: String(v.defaultValue),
                  disabled: v.disabled,
                },
                children: [
                  jsx({
                    name: "Switch.Control",
                    defaults: { disabled: false },
                    props: { value: "list", label: String(v.listLabel) || "List" },
                  }),
                  jsx({
                    name: "Switch.Control",
                    defaults: { disabled: false },
                    props: {
                      value: "grid",
                      label: String(v.gridLabel) || "Grid",
                      disabled: Boolean(v.disabled) || Boolean(v.disableGrid),
                    },
                  }),
                ],
              }),
            ],
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <div className="max-w-full overflow-x-auto">
          <Switch
            aria-label="View"
            defaultValue={String(v.defaultValue)}
            disabled={Boolean(v.disabled)}
            key={String(v.defaultValue)}
            size={v.size as never}
          >
            <Switch.Control label={String(v.listLabel) || "List"} value="list" />
            <Switch.Control
              disabled={Boolean(v.disabled) || Boolean(v.disableGrid)}
              label={String(v.gridLabel) || "Grid"}
              value="grid"
            />
          </Switch>
        </div>
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "list", label: "List selected" },
        { id: "grid", label: "Grid selected" },
        { id: "disabled", label: "Disabled group" },
        { id: "disabled-option", label: "Disabled option" },
      ]}
      render={(size, state) => (
        <Switch
          aria-label={`${size} ${state} view`}
          defaultValue={state === "grid" ? "grid" : "list"}
          disabled={state === "disabled"}
          size={size as never}
        >
          <Switch.Control label="List" value="list" />
          <Switch.Control
            disabled={state === "disabled" || state === "disabled-option"}
            label="Grid"
            value="grid"
          />
        </Switch>
      )}
      rows={sizesOf(derived).map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
