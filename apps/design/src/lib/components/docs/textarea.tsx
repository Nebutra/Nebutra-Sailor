"use client";

import { Textarea } from "@nebutra/ui/primitives";
import { useId } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

function sizesOf({ axes }: DemoProps["derived"]) {
  return axes.size?.length ? axes.size : ["sm", "md", "lg"];
}

export function Playground({ derived }: DemoProps) {
  const id = useId();
  const sizes = sizesOf(derived);
  const knobs: Knob[] = [
    {
      name: "size",
      type: "select",
      options: sizes,
      defaultValue: sizes.includes("md") ? "md" : (sizes[0] ?? "md"),
    },
    { name: "label", type: "text", defaultValue: "Release notes" },
    { name: "placeholder", type: "text", defaultValue: "What changed?" },
    { name: "defaultValue", type: "text", defaultValue: "" },
    { name: "description", type: "text", defaultValue: "Tell your team what to expect." },
    { name: "error", type: "text", defaultValue: "" },
    { name: "disabled", type: "boolean", defaultValue: false },
    { name: "readOnly", type: "boolean", defaultValue: false },
    { name: "required", type: "boolean", defaultValue: false },
    { name: "resizable", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Type to grow the textarea. A string error replaces the description and marks the control invalid."
      code={(v) => {
        const body = jsx({
          name: "Textarea",
          defaults: {
            size: "md",
            disabled: false,
            readOnly: false,
            required: false,
            resizable: false,
          },
          props: {
            id: raw("id"),
            label: String(v.label) || undefined,
            "aria-label": v.label ? undefined : "Release notes",
            size: String(v.size),
            placeholder: String(v.placeholder) || undefined,
            defaultValue: String(v.defaultValue) || undefined,
            description: String(v.description) || undefined,
            error: String(v.error) || undefined,
            disabled: v.disabled,
            readOnly: v.readOnly,
            required: v.required,
            resizable: v.resizable,
          },
        });
        return `"use client";\n\n${snippet({
          imports: [
            { names: ["Textarea"], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", "useId"], from: "react" },
          ],
          body: `export function ReleaseNotes(): ReactElement {\n  const id = useId();\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={knobs}
      render={(v) => {
        const shared = {
          id,
          size: v.size as never,
          defaultValue: String(v.defaultValue),
          disabled: Boolean(v.disabled),
          readOnly: Boolean(v.readOnly),
          required: Boolean(v.required),
          resizable: Boolean(v.resizable),
          ...present({
            placeholder: String(v.placeholder) || undefined,
            description: String(v.description) || undefined,
            error: String(v.error) || undefined,
          }),
        };
        return (
          <div className="w-80 max-w-full">
            {v.label ? (
              <Textarea {...shared} key={String(v.defaultValue)} label={String(v.label)} />
            ) : (
              <Textarea {...shared} aria-label="Release notes" key={String(v.defaultValue)} />
            )}
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
        { id: "empty", label: "Empty" },
        { id: "filled", label: "Filled" },
        { id: "disabled", label: "Disabled" },
        { id: "readonly", label: "Read-only" },
        { id: "invalid", label: "Invalid" },
      ]}
      render={(size, state) => (
        <div className="w-48">
          <Textarea
            aria-label={`${size} ${state} release notes`}
            defaultValue={state === "empty" ? "" : "Improved workspace search."}
            disabled={state === "disabled"}
            placeholder="What changed?"
            readOnly={state === "readonly"}
            size={size as never}
            {...present({ error: state === "invalid" ? "Add more detail." : undefined })}
          />
        </div>
      )}
      rows={sizesOf(derived).map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
