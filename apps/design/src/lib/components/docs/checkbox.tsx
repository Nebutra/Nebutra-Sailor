"use client";

import { Checkbox, CheckboxGroup } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const KNOBS: Knob[] = [
  { name: "children", label: "label", type: "text", defaultValue: "Email notifications" },
  {
    name: "defaultChecked",
    type: "boolean",
    defaultValue: false,
    hint: "Initial selection; the preview stays interactive.",
  },
  { name: "indeterminate", type: "boolean", defaultValue: false },
  { name: "disabled", type: "boolean", defaultValue: false },
  { name: "required", type: "boolean", defaultValue: false },
  { name: "grouped", type: "boolean", defaultValue: false },
  {
    name: "orientation",
    type: "select",
    options: ["vertical", "horizontal"],
    defaultValue: "vertical",
    hint: "Applies when grouped is enabled.",
  },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="The canonical checkbox has one size. Indeterminate is a supplied mixed state and stays mixed until its owner changes that prop."
      code={(v) => {
        const checkbox = jsx({
          name: "Checkbox",
          defaults: {
            defaultChecked: false,
            indeterminate: false,
            disabled: false,
            required: false,
          },
          props: {
            "aria-label": v.children ? undefined : "Email notifications",
            defaultChecked: v.defaultChecked,
            indeterminate: v.indeterminate,
            disabled: v.disabled,
            required: v.required,
          },
          children: String(v.children),
        });
        return snippet({
          imports: [
            {
              names: v.grouped ? ["Checkbox", "CheckboxGroup"] : ["Checkbox"],
              from: "@nebutra/ui/primitives",
            },
          ],
          body: v.grouped
            ? jsx({
                name: "CheckboxGroup",
                defaults: { orientation: "vertical" },
                props: { label: "Notifications", orientation: String(v.orientation) },
                children: [checkbox, "<Checkbox>Product updates</Checkbox>"],
              })
            : checkbox,
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const checkbox = (
          <Checkbox
            aria-label={v.children ? String(v.children) : "Email notifications"}
            defaultChecked={Boolean(v.defaultChecked)}
            disabled={Boolean(v.disabled)}
            indeterminate={Boolean(v.indeterminate)}
            key={String(v.defaultChecked)}
            required={Boolean(v.required)}
          >
            {String(v.children)}
          </Checkbox>
        );
        return v.grouped ? (
          <CheckboxGroup
            label="Notifications"
            orientation={v.orientation as "vertical" | "horizontal"}
          >
            {checkbox}
            <Checkbox>Product updates</Checkbox>
          </CheckboxGroup>
        ) : (
          checkbox
        );
      }}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "enabled", label: "Enabled" },
        { id: "disabled", label: "Disabled" },
      ]}
      note="Unchecked and checked cells can be changed with a click or Space. Mixed cells show the indeterminate prop; the component does not clear it on interaction."
      render={(state, availability) => (
        <Checkbox
          defaultChecked={state === "checked"}
          disabled={availability === "disabled"}
          indeterminate={state === "mixed"}
        >
          Notifications
        </Checkbox>
      )}
      rows={[
        { id: "unchecked", label: "Unchecked" },
        { id: "checked", label: "Checked" },
        { id: "mixed", label: "Indeterminate" },
      ]}
      rowsLabel="Initial state"
    />
  );
}
