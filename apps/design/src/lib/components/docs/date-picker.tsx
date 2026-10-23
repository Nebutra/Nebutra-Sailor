"use client";

import { DatePicker } from "@nebutra/ui/primitives";
import * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const FORMATS = ["yyyy-MM-dd", "dd/MM/yyyy", "MMM d, yyyy"] as const;
const WEEK_STARTS = ["locale", "0", "1", "6"] as const;
const SAMPLE_DATE = "2026-10-23";

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "field"
  );
}

/** An ISO date from a text knob, or undefined while it is empty or not yyyy-MM-dd. */
function isoOf(text: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : undefined;
}

/** Holds the ISO value so typing, picking and clearing have something to change. */
function LiveDate({
  initial,
  ...props
}: { initial: string } & Omit<
  React.ComponentProps<typeof DatePicker>,
  "value" | "defaultValue" | "onValueChange"
>) {
  const [value, setValue] = React.useState(initial);
  return (
    <div className="grid w-72 max-w-full gap-2">
      <DatePicker {...props} onValueChange={setValue} value={value} />
      <p aria-live="polite" className="text-muted-foreground text-xs">
        Value: {value === "" ? '"" (cleared)' : value}
      </p>
    </div>
  );
}

export function Playground({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : ["sm", "md", "lg"];

  const knobs: Knob[] = [
    { name: "size", type: "select", options: sizes, defaultValue: "md" },
    { name: "label", type: "text", defaultValue: "Due date" },
    { name: "description", type: "text", defaultValue: "" },
    {
      name: "error",
      type: "text",
      defaultValue: "",
      hint: "A message marks the field invalid and is read out.",
    },
    { name: "displayFormat", type: "select", options: FORMATS, defaultValue: "yyyy-MM-dd" },
    {
      name: "min",
      type: "text",
      defaultValue: "",
      placeholder: "2026-10-01",
      hint: "yyyy-MM-dd. Earlier days are disabled in the calendar.",
    },
    {
      name: "max",
      type: "text",
      defaultValue: "",
      placeholder: "2026-12-31",
      hint: "yyyy-MM-dd. Later days are disabled in the calendar.",
    },
    { name: "weekStartsOn", type: "select", options: WEEK_STARTS, defaultValue: "locale" },
    { name: "numberOfMonths", type: "select", options: ["1", "2"], defaultValue: "1" },
    { name: "fixedWeeks", type: "boolean", defaultValue: false },
    { name: "showOutsideDays", type: "boolean", defaultValue: true },
    { name: "required", type: "boolean", defaultValue: false },
    { name: "disabled", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Type a date in the field, or open the calendar with the button and pick one. The value you receive is always yyyy-MM-dd, whatever displayFormat shows. DatePicker has no loading state."
      code={(v) => {
        const label = String(v.label);
        const weekStartsOn = v.weekStartsOn === "locale" ? undefined : Number(v.weekStartsOn);
        const body = jsx({
          name: "DatePicker",
          defaults: { size: "md", displayFormat: "yyyy-MM-dd", showOutsideDays: true },
          props: {
            id: label ? slug(label) : undefined,
            label: label || undefined,
            "aria-label": label ? undefined : "Date",
            size: String(v.size),
            description: String(v.description) || undefined,
            error: String(v.error) || undefined,
            displayFormat: String(v.displayFormat),
            min: isoOf(String(v.min)),
            max: isoOf(String(v.max)),
            weekStartsOn,
            numberOfMonths: v.numberOfMonths === "1" ? undefined : Number(v.numberOfMonths),
            fixedWeeks: v.fixedWeeks,
            showOutsideDays: v.showOutsideDays,
            required: v.required,
            disabled: v.disabled,
            value: raw("date"),
            onValueChange: raw("setDate"),
          },
        });
        return `"use client";\n\n${snippet({
          imports: [
            { names: ["DatePicker"], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function DueDate(): ReactElement {\n  const [date, setDate] = useState("${SAMPLE_DATE}");\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={knobs}
      render={(v) => {
        const label = String(v.label);
        const weekStartsOn =
          v.weekStartsOn === "locale"
            ? undefined
            : (Number(v.weekStartsOn) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
        const shared = {
          disabled: Boolean(v.disabled),
          displayFormat: String(v.displayFormat),
          fixedWeeks: Boolean(v.fixedWeeks),
          initial: SAMPLE_DATE,
          numberOfMonths: Number(v.numberOfMonths),
          required: Boolean(v.required),
          showOutsideDays: Boolean(v.showOutsideDays),
          size: v.size as never,
          ...present({
            description: String(v.description) || undefined,
            error: String(v.error) || undefined,
            max: isoOf(String(v.max)),
            min: isoOf(String(v.min)),
            weekStartsOn,
          }),
        };
        return label ? (
          <LiveDate {...shared} id="playground-date" label={label} />
        ) : (
          <LiveDate {...shared} aria-label="Date" />
        );
      }}
    />
  );
}

const COLUMNS = [
  { id: "empty", label: "Empty" },
  { id: "selected", label: "Selected" },
  { id: "bounded", label: "Min and max" },
  { id: "described", label: "With description" },
  { id: "invalid", label: "Invalid" },
  { id: "disabled", label: "Disabled" },
];

export function StatesMatrix({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : ["sm", "md", "lg"];

  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note={`Selected uses ${SAMPLE_DATE}. Min and max bound the calendar to October 2026; a date typed into the field is not checked against them. Open any cell with the calendar button, or Tab to it. DatePicker has no loading state and no read-only state.`}
      render={(size, column) => (
        <div className="w-60">
          <DatePicker
            aria-label={`${size} ${column}`}
            disabled={column === "disabled"}
            size={size as never}
            {...(column === "empty" || column === "described"
              ? {}
              : { defaultValue: column === "invalid" ? "2026-10-24" : SAMPLE_DATE })}
            {...(column === "bounded" ? { min: "2026-10-05", max: "2026-10-28" } : {})}
            {...(column === "described" ? { description: "Shown to the client." } : {})}
            {...(column === "invalid" ? { error: "Pick a weekday" } : {})}
          />
        </div>
      )}
      rows={sizes.map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
