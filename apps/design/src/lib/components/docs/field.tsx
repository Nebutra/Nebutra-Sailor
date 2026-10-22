"use client";

import { Field, Input, Textarea } from "@nebutra/ui/primitives";
import { useId } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const KNOBS: Knob[] = [
  { name: "label", type: "text", defaultValue: "Project name" },
  { name: "description", type: "text", defaultValue: "Used in your workspace URL." },
  { name: "error", type: "text", defaultValue: "" },
  { name: "control", type: "select", options: ["Input", "Textarea"], defaultValue: "Input" },
  { name: "disabled", type: "boolean", defaultValue: false, hint: "Applied to the child control." },
  { name: "readOnly", type: "boolean", defaultValue: false, hint: "Applied to the child control." },
];

function LiveField({
  label,
  description,
  error,
  multiline,
  disabled,
  readOnly,
}: {
  label: string;
  description: string;
  error: string;
  multiline: boolean;
  disabled: boolean;
  readOnly: boolean;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || description;
  const Control = multiline ? Textarea : Input;
  return (
    <div className="w-72 max-w-full">
      <Field
        htmlFor={id}
        label={label}
        {...present({ description: description || undefined, error: error || undefined })}
      >
        <Control
          aria-describedby={message ? messageId : undefined}
          aria-label={label ? undefined : "Project name"}
          defaultValue={readOnly ? "acme-web" : ""}
          disabled={disabled}
          error={Boolean(error)}
          id={id}
          key={String(readOnly)}
          placeholder="acme-web"
          readOnly={readOnly}
        />
        {message ? (
          <span className="sr-only" id={messageId}>
            {message}
          </span>
        ) : null}
      </Field>
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Field owns the visible label and message. The child owns disabled, read-only, and invalid state; the example explicitly links its message for assistive technology."
      code={(v) => {
        const control = String(v.control);
        const message = String(v.error) || String(v.description);
        const body = jsx({
          name: "Field",
          props: {
            htmlFor: raw("id"),
            label: String(v.label),
            description: String(v.description) || undefined,
            error: String(v.error) || undefined,
          },
          children: [
            jsx({
              name: control,
              defaults: { disabled: false, readOnly: false, error: false },
              props: {
                id: raw("id"),
                "aria-label": v.label ? undefined : "Project name",
                "aria-describedby": message ? raw('id + "-message"') : undefined,
                placeholder: "acme-web",
                defaultValue: v.readOnly ? "acme-web" : undefined,
                disabled: v.disabled,
                readOnly: v.readOnly,
                error: Boolean(v.error),
              },
            }),
            ...(message
              ? [
                  jsx({
                    name: "span",
                    props: { id: raw('id + "-message"'), className: "sr-only" },
                    children: message,
                  }),
                ]
              : []),
          ],
        });
        return `"use client";\n\n${snippet({
          imports: [
            { names: ["Field", control], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useId"], from: "react" },
          ],
          body: `export function ProjectField(): ReactElement {\n  const id = useId();\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveField
          description={String(v.description)}
          disabled={Boolean(v.disabled)}
          error={String(v.error)}
          label={String(v.label)}
          multiline={v.control === "Textarea"}
          readOnly={Boolean(v.readOnly)}
        />
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "default", label: "Label only" },
        { id: "description", label: "Description" },
        { id: "error", label: "Error" },
        { id: "disabled", label: "Disabled child" },
      ]}
      note="Field has no loading, disabled, or size prop. Error replaces description; the child receives invalid state and an explicit accessible message association."
      render={(control, state) => (
        <LiveField
          description={state === "default" ? "" : "Used in your workspace URL."}
          disabled={state === "disabled"}
          error={state === "error" ? "This name is already taken." : ""}
          label="Project name"
          multiline={control === "textarea"}
          readOnly={false}
        />
      )}
      rows={[
        { id: "input", label: "Input" },
        { id: "textarea", label: "Textarea" },
      ]}
      rowsLabel="Child control"
    />
  );
}
