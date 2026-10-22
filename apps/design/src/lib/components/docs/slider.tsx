"use client";

import { Slider } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const KNOBS: Knob[] = [
  { name: "label", type: "text", defaultValue: "Volume" },
  {
    name: "defaultValue",
    type: "select",
    options: ["0", "25", "50", "75", "100"],
    defaultValue: "50",
  },
  { name: "step", type: "select", options: ["1", "5", "25"], defaultValue: "1" },
  { name: "unit", type: "text", defaultValue: "%" },
  { name: "showValue", type: "boolean", defaultValue: true },
  { name: "disabled", type: "boolean", defaultValue: false },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="This is a single-thumb slider, including in array value mode. Drag the thumb or use the arrow keys; Home and End reach the limits."
      code={(v) =>
        snippet({
          imports: [{ names: ["Slider"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "Slider",
            defaults: { step: 1, showValue: true, disabled: false },
            props: {
              label: String(v.label) || undefined,
              "aria-label": v.label ? undefined : "Volume",
              defaultValue: Number(v.defaultValue),
              min: 0,
              max: 100,
              step: Number(v.step),
              unit: String(v.unit) || undefined,
              showValue: v.showValue,
              disabled: v.disabled,
            },
          }),
        })
      }
      knobs={KNOBS}
      render={(v) => (
        <div className="w-72 max-w-full">
          <Slider
            aria-label={v.label ? undefined : "Volume"}
            defaultValue={Number(v.defaultValue)}
            disabled={Boolean(v.disabled)}
            key={`${v.defaultValue}-${v.step}`}
            label={String(v.label)}
            max={100}
            min={0}
            showValue={Boolean(v.showValue)}
            step={Number(v.step)}
            unit={String(v.unit)}
          />
        </div>
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "enabled", label: "Enabled" },
        { id: "disabled", label: "Disabled" },
        { id: "hidden", label: "Without readout" },
      ]}
      note="Slider exposes one thumb and one visual size. Values in enabled cells stay editable; the readout follows the thumb."
      render={(value, state) => (
        <div className="w-44">
          <Slider
            aria-label={`${value} percent ${state}`}
            defaultValue={Number(value)}
            disabled={state === "disabled"}
            showValue={state !== "hidden"}
            unit="%"
          />
        </div>
      )}
      rows={[
        { id: "0", label: "Minimum" },
        { id: "50", label: "Midpoint" },
        { id: "100", label: "Maximum" },
      ]}
      rowsLabel="Initial value"
    />
  );
}
