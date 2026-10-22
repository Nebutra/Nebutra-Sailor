"use client";

import { Tabs } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import { axis, axisDefault, type DemoProps } from "../derived";

function variantsOf(derived: DemoProps["derived"]) {
  const variants = axis(derived, "list", "variant");
  return variants.length ? variants : ["default"];
}

export function Playground({ derived }: DemoProps) {
  const variants = variantsOf(derived);
  const shapes = axis(derived, "list", "shape");
  const sizes = derived.axes.size?.length ? derived.axes.size : ["xs", "sm", "md", "lg"];
  const defaultVariant = axisDefault(derived, "list", "variant") ?? variants[0] ?? "default";
  const defaultShape = axisDefault(derived, "list", "shape") ?? "default";
  const knobs: Knob[] = [
    { name: "variant", type: "select", options: variants, defaultValue: defaultVariant },
    {
      name: "shape",
      type: "select",
      options: shapes.length ? shapes : ["default"],
      defaultValue: defaultShape,
    },
    {
      name: "size",
      type: "select",
      options: sizes,
      defaultValue: sizes.includes("md") ? "md" : (sizes[0] ?? "md"),
    },
    {
      name: "defaultValue",
      type: "select",
      options: ["overview", "activity"],
      defaultValue: "overview",
    },
    {
      name: "activationMode",
      type: "select",
      options: ["manual", "automatic"],
      defaultValue: "manual",
    },
    { name: "overviewLabel", type: "text", defaultValue: "Overview" },
    { name: "activityLabel", type: "text", defaultValue: "Activity" },
    { name: "badge", type: "boolean", defaultValue: false },
    { name: "disableActivity", type: "boolean", defaultValue: false },
    { name: "disabled", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Switch tabs to change the panel. Manual activation uses arrows to move focus and Enter or Space to select; automatic activation selects on focus."
      code={(v) => {
        const items = [
          {
            value: "overview",
            title: String(v.overviewLabel) || "Overview",
            content: "Project overview.",
          },
          {
            value: "activity",
            title: String(v.activityLabel) || "Activity",
            content: "Recent project activity.",
            ...(v.badge ? { badge: "3" } : {}),
            ...(v.disableActivity ? { disabled: true } : {}),
          },
        ];
        return snippet({
          imports: [{ names: ["Tabs"], from: "@nebutra/ui/primitives" }],
          body: `const projectTabs = ${JSON.stringify(items, null, 2)};\n\n${jsx({
            name: "Tabs",
            defaults: {
              variant: defaultVariant,
              shape: defaultShape,
              size: "md",
              activationMode: "manual",
              disabled: false,
            },
            props: {
              "aria-label": "Project",
              tabs: raw("projectTabs"),
              variant: String(v.variant),
              shape: String(v.shape),
              size: String(v.size),
              defaultValue: String(v.defaultValue),
              activationMode: String(v.activationMode),
              disabled: v.disabled,
            },
          })}`,
        });
      }}
      knobs={knobs}
      render={(v) => (
        <div className="w-80 max-w-full break-words">
          <Tabs
            activationMode={v.activationMode as "manual" | "automatic"}
            aria-label="Project"
            defaultValue={String(v.defaultValue)}
            disabled={Boolean(v.disabled)}
            key={String(v.defaultValue)}
            shape={v.shape as never}
            size={v.size as never}
            tabs={[
              {
                value: "overview",
                title: String(v.overviewLabel) || "Overview",
                content: "Project overview.",
              },
              {
                value: "activity",
                title: String(v.activityLabel) || "Activity",
                content: "Recent project activity.",
                disabled: Boolean(v.disableActivity),
                ...(v.badge ? { badge: "3" } : {}),
              },
            ]}
            variant={v.variant as never}
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
        { id: "first", label: "First selected" },
        { id: "second", label: "Second selected" },
        { id: "disabled-item", label: "Disabled tab" },
        { id: "disabled", label: "Disabled group" },
      ]}
      render={(variant, state) => (
        <div className="w-60">
          <Tabs
            aria-label={`${variant} ${state} project`}
            defaultValue={state === "second" ? "activity" : "overview"}
            disabled={state === "disabled"}
            tabs={[
              { value: "overview", title: "Overview", content: "Project overview." },
              {
                value: "activity",
                title: "Activity",
                content: "Recent activity.",
                disabled: state === "disabled-item",
              },
            ]}
            variant={variant as never}
          />
        </div>
      )}
      rows={variantsOf(derived).map((variant) => ({ id: variant, label: variant }))}
      rowsLabel="Variant"
    />
  );
}
