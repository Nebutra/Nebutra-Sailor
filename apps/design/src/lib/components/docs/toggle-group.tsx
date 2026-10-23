"use client";

import { ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import { axis, axisDefault, type DemoProps } from "../derived";

const RANGES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

// The registry has no cva request for toggleGroupItemVariants yet, so these lists are the
// fallback; once it declares one under the key "item" the axes are read from source instead.
const FALLBACK_VARIANTS = ["default", "outline", "pill"];
const FALLBACK_SIZES = ["default", "sm", "lg"];

function variantsOf(derived: DemoProps["derived"]) {
  const variants = axis(derived, "item", "variant");
  return variants.length ? variants : FALLBACK_VARIANTS;
}

function sizesOf(derived: DemoProps["derived"]) {
  const sizes = axis(derived, "item", "size");
  return sizes.length ? sizes : FALLBACK_SIZES;
}

export function Playground({ derived }: DemoProps) {
  const defaults = {
    type: "single",
    variant: axisDefault(derived, "item", "variant") ?? "default",
    size: axisDefault(derived, "item", "size") ?? "default",
    disabled: false,
  };
  const knobs: Knob[] = [
    { name: "type", type: "select", options: ["single", "multiple"], defaultValue: "single" },
    {
      name: "variant",
      type: "select",
      options: variantsOf(derived),
      defaultValue: defaults.variant,
    },
    { name: "size", type: "select", options: sizesOf(derived), defaultValue: defaults.size },
    {
      name: "selected",
      type: "select",
      options: ["none", "day", "week", "month"],
      defaultValue: "week",
      hint: "Initial selection; the preview stays interactive.",
    },
    { name: "dayLabel", label: "first label", type: "text", defaultValue: "Day" },
    { name: "disableMonth", label: "disable last item", type: "boolean", defaultValue: false },
    { name: "disabled", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Single behaves as a radio group: one stop for Tab, arrows move and select, and clicking the selected item does nothing. Multiple is a row of independent toggle buttons. Items never wrap; a long label scrolls within this stage."
      code={(v) => {
        const multiple = v.type === "multiple";
        const selected = String(v.selected);
        const defaultValue =
          selected === "none" ? undefined : multiple ? raw(JSON.stringify([selected])) : selected;
        return snippet({
          imports: [{ names: ["ToggleGroup", "ToggleGroupItem"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "ToggleGroup",
            defaults,
            props: {
              "aria-label": "Range",
              type: String(v.type),
              variant: String(v.variant),
              size: String(v.size),
              defaultValue,
              disabled: v.disabled,
            },
            children: RANGES.map((range) =>
              jsx({
                name: "ToggleGroupItem",
                defaults: { disabled: false },
                props: {
                  value: range.value,
                  disabled: range.value === "month" && Boolean(v.disableMonth),
                },
                children: range.value === "day" ? String(v.dayLabel) || "Day" : range.label,
              }),
            ),
          }),
        });
      }}
      knobs={knobs}
      render={(v) => {
        const multiple = v.type === "multiple";
        const selected = String(v.selected);
        return (
          <div className="max-w-full overflow-x-auto p-1">
            <ToggleGroup
              aria-label="Range"
              defaultValue={
                multiple
                  ? selected === "none"
                    ? []
                    : [selected]
                  : selected === "none"
                    ? ""
                    : selected
              }
              disabled={Boolean(v.disabled)}
              key={`${String(v.type)}-${selected}`}
              size={v.size as never}
              type={multiple ? "multiple" : "single"}
              variant={v.variant as never}
            >
              {RANGES.map((range) => (
                <ToggleGroupItem
                  disabled={range.value === "month" && Boolean(v.disableMonth)}
                  key={range.value}
                  value={range.value}
                >
                  {range.value === "day" ? String(v.dayLabel) || "Day" : range.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        );
      }}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "off", label: "None selected" },
        { id: "on", label: "Selected" },
        { id: "multiple", label: "Multiple on" },
        { id: "disabled-item", label: "Item disabled" },
        { id: "disabled", label: "Group disabled" },
      ]}
      note="Rows are the variant; sizes are in the Playground. ToggleGroup has no loading or invalid state. Selected is data-state=on, a fill and shadow on default, an accent fill on outline and a tinted label on pill. Hover and Tab are live: single is one tab stop, multiple has one per item."
      render={(variant, state) => (
        <ToggleGroup
          aria-label={`${variant} ${state} range`}
          defaultValue={state === "multiple" ? ["day", "month"] : state === "off" ? "" : "week"}
          disabled={state === "disabled"}
          type={state === "multiple" ? "multiple" : "single"}
          variant={variant as never}
        >
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
          <ToggleGroupItem disabled={state === "disabled-item"} value="month">
            Month
          </ToggleGroupItem>
        </ToggleGroup>
      )}
      rows={variantsOf(derived).map((variant) => ({ id: variant, label: variant }))}
      rowsLabel="Variant"
    />
  );
}
