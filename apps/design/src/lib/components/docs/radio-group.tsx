"use client";

import { RadioGroup, RadioGroupItem } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const PLANS = [
  { value: "starter", label: "Starter", description: "For personal projects" },
  { value: "team", label: "Team", description: "For shared workspaces" },
  { value: "enterprise", label: "Enterprise", description: "For larger organizations" },
] as const;

const KNOBS: Knob[] = [
  { name: "label", type: "text", defaultValue: "Plan" },
  {
    name: "orientation",
    type: "select",
    options: ["vertical", "horizontal"],
    defaultValue: "vertical",
  },
  {
    name: "defaultValue",
    type: "select",
    options: ["none", "starter", "team", "enterprise"],
    defaultValue: "starter",
  },
  { name: "descriptions", type: "boolean", defaultValue: true },
  { name: "disableEnterprise", type: "boolean", defaultValue: false },
  { name: "disabled", type: "boolean", defaultValue: false },
  { name: "required", type: "boolean", defaultValue: false },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="A native fieldset and radio inputs keep each selection exclusive. Each instance generates its own form name, including in Split theme."
      code={(v) =>
        snippet({
          imports: [{ names: ["RadioGroup", "RadioGroupItem"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "RadioGroup",
            defaults: { orientation: "vertical", disabled: false, required: false },
            props: {
              label: String(v.label) || undefined,
              "aria-label": v.label ? undefined : "Plan",
              orientation: String(v.orientation),
              defaultValue: v.defaultValue === "none" ? undefined : String(v.defaultValue),
              disabled: v.disabled,
              required: v.required,
            },
            children: PLANS.map((plan) =>
              jsx({
                name: "RadioGroupItem",
                defaults: { disabled: false },
                props: {
                  value: plan.value,
                  description: v.descriptions ? plan.description : undefined,
                  disabled: plan.value === "enterprise" && Boolean(v.disableEnterprise),
                },
                children: plan.label,
              }),
            ),
          }),
        })
      }
      knobs={KNOBS}
      render={(v) => (
        <RadioGroup
          aria-label="Plan"
          defaultValue={v.defaultValue === "none" ? "" : String(v.defaultValue)}
          disabled={Boolean(v.disabled)}
          key={String(v.defaultValue)}
          label={String(v.label)}
          orientation={v.orientation as "vertical" | "horizontal"}
          required={Boolean(v.required)}
        >
          {PLANS.map((plan) => (
            <RadioGroupItem
              disabled={plan.value === "enterprise" && Boolean(v.disableEnterprise)}
              key={plan.value}
              value={plan.value}
              {...present({ description: v.descriptions ? plan.description : undefined })}
            >
              {plan.label}
            </RadioGroupItem>
          ))}
        </RadioGroup>
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "unselected", label: "Unselected" },
        { id: "selected", label: "Selected" },
        { id: "disabled", label: "Disabled group" },
        { id: "disabled-option", label: "Disabled option" },
      ]}
      render={(orientation, state) => (
        <RadioGroup
          aria-label={`${orientation} ${state} plan`}
          defaultValue={state === "unselected" ? "" : "starter"}
          disabled={state === "disabled"}
          orientation={orientation as "vertical" | "horizontal"}
        >
          <RadioGroupItem value="starter">Starter</RadioGroupItem>
          <RadioGroupItem disabled={state === "disabled-option"} value="team">
            Team
          </RadioGroupItem>
        </RadioGroup>
      )}
      rows={[
        { id: "vertical", label: "Vertical" },
        { id: "horizontal", label: "Horizontal" },
      ]}
      rowsLabel="Orientation"
    />
  );
}
