"use client";

import { Toggle } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

function sizesOf({ axes }: DemoProps["derived"]) {
  return axes.size?.length ? axes.size : ["small", "normal", "large"];
}

export function Playground({ derived }: DemoProps) {
  const sizes = sizesOf(derived);
  const colors = derived.axes.color?.length ? derived.axes.color : ["default"];
  const knobs: Knob[] = [
    {
      name: "size",
      type: "select",
      options: sizes,
      defaultValue: sizes.includes("small") ? "small" : (sizes[0] ?? "small"),
    },
    {
      name: "color",
      type: "select",
      options: colors,
      defaultValue: colors.includes("default") ? "default" : (colors[0] ?? "default"),
    },
    { name: "children", label: "label", type: "text", defaultValue: "Auto deploy" },
    {
      name: "direction",
      type: "select",
      options: ["label-first", "switch-first"],
      defaultValue: "label-first",
    },
    { name: "labelCasing", type: "select", options: ["title", "normal"], defaultValue: "title" },
    {
      name: "defaultChecked",
      type: "boolean",
      defaultValue: false,
      hint: "Initial state; click or press Space to change it.",
    },
    { name: "disabled", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Toggle stores a boolean setting. Sizes and colors come from the registered library token arrays."
      code={(v) =>
        snippet({
          imports: [{ names: ["Toggle"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "Toggle",
            defaults: {
              size: "small",
              color: "default",
              direction: "label-first",
              labelCasing: "title",
              defaultChecked: false,
              disabled: false,
            },
            props: {
              size: String(v.size),
              color: String(v.color),
              direction: String(v.direction),
              labelCasing: String(v.labelCasing),
              defaultChecked: v.defaultChecked,
              disabled: v.disabled,
              "aria-label": v.children ? undefined : "Auto deploy",
            },
            children: String(v.children),
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <Toggle
          aria-label="Auto deploy"
          color={v.color as never}
          defaultChecked={Boolean(v.defaultChecked)}
          direction={v.direction as "label-first" | "switch-first"}
          disabled={Boolean(v.disabled)}
          key={String(v.defaultChecked)}
          labelCasing={v.labelCasing as "title" | "normal"}
          size={v.size as never}
        >
          {String(v.children) || null}
        </Toggle>
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "off", label: "Off" },
        { id: "on", label: "On" },
        { id: "disabled-off", label: "Disabled off" },
        { id: "disabled-on", label: "Disabled on" },
      ]}
      render={(size, state) => (
        <Toggle
          defaultChecked={state === "on" || state === "disabled-on"}
          disabled={state.startsWith("disabled")}
          size={size as never}
        >
          Auto deploy
        </Toggle>
      )}
      rows={sizesOf(derived).map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
