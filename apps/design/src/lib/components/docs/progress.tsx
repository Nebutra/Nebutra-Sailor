"use client";

import { Progress } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import { axis, axisDefault, type DemoProps } from "../derived";
import { present } from "./present";

export function Playground({ derived }: DemoProps) {
  const defaults = {
    variant: axisDefault(derived, "progress", "variant") ?? "default",
    size: axisDefault(derived, "progress", "size") ?? "default",
    max: 100,
  };
  const knobs: Knob[] = [
    {
      name: "variant",
      type: "select",
      options: axis(derived, "progress", "variant"),
      defaultValue: defaults.variant,
    },
    {
      name: "size",
      type: "select",
      options: axis(derived, "progress", "size"),
      defaultValue: defaults.size,
    },
    { name: "value", type: "select", options: ["0", "25", "50", "75", "100"], defaultValue: "50" },
    { name: "max", type: "select", options: ["100", "200"], defaultValue: "100" },
    { name: "label", type: "text", defaultValue: "Uploading assets" },
    { name: "showValue", type: "boolean", defaultValue: true },
    { name: "indeterminate", type: "boolean", defaultValue: false },
    { name: "animated", type: "boolean", defaultValue: true },
  ];
  return (
    <ComponentPlayground
      caption="value uses max units: 50 of 200 is 25%. Pass null explicitly for indeterminate; the implementation defaults an omitted value to 0. This is status output, with no disabled state or keyboard interaction."
      code={(v) =>
        snippet({
          imports: [{ names: ["Progress"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "div",
            props: { className: "w-64 max-w-full" },
            children: [
              jsx({
                name: "Progress",
                defaults,
                props: {
                  variant: String(v.variant),
                  size: String(v.size),
                  value: v.indeterminate ? raw("null") : Number(v.value),
                  max: Number(v.max),
                  label: String(v.label) || undefined,
                  "aria-label": String(v.label) || "Upload progress",
                  showValue: v.showValue,
                  animated: v.animated ? undefined : raw("false"),
                },
              }),
            ],
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <div className="w-64 max-w-full">
          <Progress
            animated={Boolean(v.animated)}
            aria-label={String(v.label) || "Upload progress"}
            max={Number(v.max)}
            showValue={Boolean(v.showValue)}
            size={v.size as never}
            value={v.indeterminate ? null : Number(v.value)}
            variant={v.variant as never}
            {...present({ label: String(v.label) || undefined })}
          />
        </div>
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "start", label: "0 of 100" },
        { id: "partial", label: "50 of 100" },
        { id: "complete", label: "100 of 100" },
        { id: "indeterminate", label: "Unknown total" },
      ]}
      note="Sizes come from progressVariants. The first three columns have known values; unknown total passes value={null} and omits a numeric readout. These outputs are not focusable."
      render={(size, column) => (
        <div className="w-40">
          <Progress
            aria-label={`${size} ${column} upload progress`}
            showValue={column !== "indeterminate"}
            size={size as never}
            value={
              column === "indeterminate"
                ? null
                : column === "complete"
                  ? 100
                  : column === "partial"
                    ? 50
                    : 0
            }
          />
        </div>
      )}
      rows={axis(derived, "progress", "size").map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
