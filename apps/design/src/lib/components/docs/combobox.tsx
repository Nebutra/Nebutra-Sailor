"use client";

import { Combobox, type ComboboxOption } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const OPTIONS: ComboboxOption[] = [
  { value: "next", label: "Next.js", group: "React" },
  { value: "remix", label: "Remix", group: "React" },
  { value: "astro", label: "Astro", group: "Other" },
  { value: "legacy", label: "Legacy (unavailable)", group: "Other", disabled: true },
];

function sizesOf({ axes }: DemoProps["derived"]) {
  return axes.size?.length ? axes.size : ["small", "medium", "large"];
}

export function Playground({ derived }: DemoProps) {
  const sizes = sizesOf(derived);
  const knobs: Knob[] = [
    {
      name: "size",
      type: "select",
      options: sizes,
      defaultValue: sizes.includes("medium") ? "medium" : (sizes[0] ?? "medium"),
    },
    { name: "label", type: "text", defaultValue: "Framework" },
    { name: "placeholder", type: "text", defaultValue: "Select a framework" },
    { name: "searchPlaceholder", type: "text", defaultValue: "Search frameworks..." },
    { name: "emptyMessage", type: "text", defaultValue: "No frameworks found." },
    { name: "loadingMessage", type: "text", defaultValue: "Loading frameworks..." },
    {
      name: "defaultValue",
      type: "select",
      options: ["none", "next", "remix", "astro"],
      defaultValue: "none",
    },
    { name: "empty", type: "boolean", defaultValue: false, hint: "Supply an empty options array." },
    { name: "loading", type: "boolean", defaultValue: false },
    { name: "errored", type: "boolean", defaultValue: false },
    { name: "disabled", type: "boolean", defaultValue: false },
    { name: "hideLabel", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Open and search the list. Selecting the current option clears it. Loading and empty messages are visible inside the open list."
      code={(v) =>
        snippet({
          imports: [{ names: ["Combobox", "type ComboboxOption"], from: "@nebutra/ui/primitives" }],
          body: `const frameworks: ComboboxOption[] = ${JSON.stringify(v.empty ? [] : OPTIONS, null, 2)};\n\n${jsx(
            {
              name: "Combobox",
              defaults: {
                size: "medium",
                hideLabel: false,
                loading: false,
                errored: false,
                disabled: false,
              },
              props: {
                options: raw("frameworks"),
                label: String(v.label) || undefined,
                "aria-label": v.label ? undefined : "Framework",
                hideLabel: v.hideLabel,
                size: String(v.size),
                placeholder: String(v.placeholder),
                searchPlaceholder: String(v.searchPlaceholder),
                emptyMessage: String(v.emptyMessage),
                loadingMessage: String(v.loadingMessage),
                defaultValue: v.defaultValue === "none" ? undefined : String(v.defaultValue),
                loading: v.loading,
                errored: v.errored,
                disabled: v.disabled,
              },
            },
          )}`,
        })
      }
      knobs={knobs}
      render={(v) => (
        <div className="w-72 max-w-full">
          <Combobox
            aria-label="Framework"
            defaultValue={v.defaultValue === "none" ? null : String(v.defaultValue)}
            disabled={Boolean(v.disabled)}
            emptyMessage={String(v.emptyMessage)}
            errored={Boolean(v.errored)}
            hideLabel={Boolean(v.hideLabel)}
            key={String(v.defaultValue)}
            label={String(v.label)}
            loading={Boolean(v.loading)}
            loadingMessage={String(v.loadingMessage)}
            options={v.empty ? [] : OPTIONS}
            placeholder={String(v.placeholder)}
            searchPlaceholder={String(v.searchPlaceholder)}
            size={v.size as never}
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
        { id: "empty-selection", label: "Unselected" },
        { id: "selected", label: "Selected" },
        { id: "disabled", label: "Disabled" },
        { id: "invalid", label: "Invalid" },
        { id: "loading", label: "Loading list" },
        { id: "empty", label: "Empty list" },
      ]}
      note="Each trigger opens its own searchable list. Open the loading and empty cells to inspect their messages; the unavailable option stays disabled."
      render={(size, state) => (
        <div className="w-48">
          <Combobox
            aria-label={`${size} ${state} framework`}
            defaultValue={state === "selected" ? "next" : null}
            disabled={state === "disabled"}
            emptyMessage="No frameworks found."
            errored={state === "invalid"}
            loading={state === "loading"}
            options={state === "empty" ? [] : OPTIONS}
            placeholder="Framework"
            size={size as never}
          />
        </div>
      )}
      rows={sizesOf(derived).map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
