"use client";

import { Input, Label, Textarea } from "@nebutra/ui/primitives";
import { useId } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const KNOBS: Knob[] = [
  { name: "children", label: "label", type: "text", defaultValue: "Project name" },
  { name: "control", type: "select", options: ["Input", "Textarea"], defaultValue: "Input" },
  { name: "required", type: "boolean", defaultValue: false },
  {
    name: "disabled",
    type: "boolean",
    defaultValue: false,
    hint: "Disables the associated control. Label has no disabled prop.",
  },
];

function LabelledControl({
  label,
  multiline,
  required,
  disabled,
}: {
  label: string;
  multiline: boolean;
  required: boolean;
  disabled: boolean;
}) {
  const id = useId();
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid w-64 max-w-full gap-2">
      <Control
        aria-label={label ? undefined : "Project name"}
        className="peer"
        disabled={disabled}
        id={id}
        required={required}
      />
      <Label className="order-first" htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive-strong">
            {" "}
            *
          </span>
        ) : null}
      </Label>
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Click the label to focus the control. The control precedes its label in the DOM so peer-disabled styling works; order-first places the label above it."
      code={(v) => {
        const control = String(v.control);
        const body = jsx({
          name: "div",
          props: { className: "grid w-64 max-w-full gap-2" },
          children: [
            jsx({
              name: control,
              defaults: { required: false, disabled: false },
              props: {
                id: raw("id"),
                className: "peer",
                "aria-label": v.children ? undefined : "Project name",
                required: v.required,
                disabled: v.disabled,
              },
            }),
            jsx({
              name: "Label",
              props: { htmlFor: raw("id"), className: "order-first" },
              children: v.required
                ? [
                    jsx({ name: "span", props: {}, children: String(v.children) }),
                    '<span aria-hidden="true" className="text-destructive-strong"> *</span>',
                  ]
                : String(v.children),
            }),
          ],
        });
        return `"use client";\n\n${snippet({
          imports: [
            { names: [control, "Label"], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useId"], from: "react" },
          ],
          body: `export function ProjectName(): ReactElement {\n  const id = useId();\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LabelledControl
          disabled={Boolean(v.disabled)}
          label={String(v.children)}
          multiline={v.control === "Textarea"}
          required={Boolean(v.required)}
        />
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "default", label: "Default" },
        { id: "required", label: "Required control" },
        { id: "disabled", label: "Disabled control" },
      ]}
      note="Label has no size, loading, or disabled API. These cells show its real association with enabled, required, and disabled form controls."
      render={(control, state) => (
        <LabelledControl
          disabled={state === "disabled"}
          label="Project name"
          multiline={control === "textarea"}
          required={state === "required"}
        />
      )}
      rows={[
        { id: "input", label: "Input" },
        { id: "textarea", label: "Textarea" },
      ]}
      rowsLabel="Associated control"
    />
  );
}
