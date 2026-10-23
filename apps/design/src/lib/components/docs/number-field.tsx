"use client";

import { NumberField } from "@nebutra/ui/primitives";
import * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const STEPS = ["1", "5", "0.1"] as const;
const FORMATS = {
  plain: undefined,
  grouped: { useGrouping: true },
  currency: { style: "currency", currency: "USD" },
} satisfies Record<string, Intl.NumberFormatOptions | undefined>;
type FormatName = keyof typeof FORMATS;
const FORMAT_SOURCE: Record<FormatName, string | undefined> = {
  plain: undefined,
  grouped: "{ useGrouping: true }",
  currency: '{ style: "currency", currency: "USD" }',
};

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "field"
  );
}

/** A finite number from a text knob, or undefined when it is empty or not numeric. */
function numberOf(text: string): number | undefined {
  if (text.trim() === "") return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Holds the value so the steppers, typing and clamping have something to change. */
function LiveNumber({
  initial,
  ...props
}: { initial: number | null } & Omit<
  React.ComponentProps<typeof NumberField>,
  "value" | "defaultValue" | "onValueChange"
>) {
  const [value, setValue] = React.useState<number | null>(initial);
  return <NumberField {...props} onValueChange={setValue} value={value} />;
}

export function Playground({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : ["sm", "md", "lg"];

  const knobs: Knob[] = [
    { name: "size", type: "select", options: sizes, defaultValue: "md" },
    { name: "label", type: "text", defaultValue: "Quantity" },
    { name: "min", type: "text", defaultValue: "0", hint: "Empty means no lower bound." },
    { name: "max", type: "text", defaultValue: "100", hint: "Empty means no upper bound." },
    { name: "step", type: "select", options: STEPS, defaultValue: "1" },
    { name: "format", type: "select", options: Object.keys(FORMATS), defaultValue: "plain" },
    { name: "suffix", type: "text", defaultValue: "" },
    { name: "description", type: "text", defaultValue: "" },
    {
      name: "error",
      type: "text",
      defaultValue: "",
      hint: "A message marks the field invalid and is read out.",
    },
    { name: "scrub", type: "boolean", defaultValue: false, hint: "Drag the label sideways." },
    { name: "hideSteppers", type: "boolean", defaultValue: false },
    { name: "allowWheelScrub", type: "boolean", defaultValue: false },
    { name: "snapOnStep", type: "boolean", defaultValue: false },
    { name: "disabled", type: "boolean", defaultValue: false },
    { name: "readOnly", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Type a number, use the steppers, or press the arrow keys (Shift for larger steps, Alt for smaller). Wheel scrubbing is off unless you switch it on. NumberField has no loading state."
      code={(v) => {
        const label = String(v.label);
        const min = numberOf(String(v.min));
        const max = numberOf(String(v.max));
        const format = FORMAT_SOURCE[v.format as FormatName];
        const body = jsx({
          name: "NumberField",
          defaults: { size: "md" },
          props: {
            id: label ? slug(label) : undefined,
            label: label || undefined,
            "aria-label": label ? undefined : "Number",
            size: String(v.size),
            min,
            max,
            step: v.step === "1" ? undefined : Number(v.step),
            format: format ? raw(format) : undefined,
            suffix: String(v.suffix) || undefined,
            description: String(v.description) || undefined,
            error: String(v.error) || undefined,
            scrub: v.scrub,
            hideSteppers: v.hideSteppers,
            allowWheelScrub: v.allowWheelScrub,
            snapOnStep: v.snapOnStep,
            disabled: v.disabled,
            readOnly: v.readOnly,
            value: raw("value"),
            onValueChange: raw("setValue"),
          },
        });
        return `"use client";\n\n${snippet({
          imports: [
            { names: ["NumberField"], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function QuantityField(): ReactElement {\n  const [value, setValue] = useState<number | null>(10);\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={knobs}
      render={(v) => {
        const label = String(v.label);
        const min = numberOf(String(v.min));
        const max = numberOf(String(v.max));
        const shared = {
          allowWheelScrub: Boolean(v.allowWheelScrub),
          disabled: Boolean(v.disabled),
          hideSteppers: Boolean(v.hideSteppers),
          initial: 10,
          readOnly: Boolean(v.readOnly),
          scrub: Boolean(v.scrub),
          size: v.size as never,
          snapOnStep: Boolean(v.snapOnStep),
          step: Number(v.step),
          ...present({
            description: String(v.description) || undefined,
            error: String(v.error) || undefined,
            format: FORMATS[v.format as FormatName],
            max,
            min,
            suffix: String(v.suffix) || undefined,
          }),
        };
        return (
          <div className="w-64 max-w-full">
            {label ? (
              <LiveNumber {...shared} id="playground-number" label={label} />
            ) : (
              <LiveNumber {...shared} aria-label="Number" />
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
  { id: "suffix", label: "With suffix" },
  { id: "min", label: "At minimum" },
  { id: "max", label: "At maximum" },
  { id: "disabled", label: "Disabled" },
  { id: "readonly", label: "Read-only" },
  { id: "invalid", label: "Invalid" },
];

export function StatesMatrix({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : ["sm", "md", "lg"];

  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note="At minimum and at maximum use min={0} max={10}: the stepper on the bound disables itself. NumberField has no loading state. Hover the steppers, or Tab to the field and press the arrow keys."
      render={(size, column) => (
        <div className="w-48">
          <LiveNumber
            aria-label={`${size} ${column}`}
            disabled={column === "disabled"}
            initial={
              column === "default" || column === "invalid"
                ? null
                : column === "min"
                  ? 0
                  : column === "max"
                    ? 10
                    : 4
            }
            max={10}
            min={0}
            placeholder="0-10"
            readOnly={column === "readonly"}
            size={size as never}
            {...(column === "suffix" ? { suffix: "px" } : {})}
            {...(column === "invalid" ? { error: "Enter a number from 0 to 10" } : {})}
          />
        </div>
      )}
      rows={sizes.map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
