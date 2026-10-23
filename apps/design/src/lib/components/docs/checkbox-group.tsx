"use client";

import { Checkbox, CheckboxGroup } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const CHANNELS = ["Email", "SMS", "Push", "In-app"] as const;
const LONG_CHANNEL = "Weekly digest of every deployment, domain and billing event";

const KNOBS: Knob[] = [
  { name: "label", type: "text", defaultValue: "Notifications" },
  {
    name: "orientation",
    type: "select",
    options: ["vertical", "horizontal"],
    defaultValue: "vertical",
  },
  { name: "count", type: "select", options: ["2", "3", "4"], defaultValue: "3" },
  { name: "checkFirst", label: "check first", type: "boolean", defaultValue: true },
  { name: "disableLast", label: "disable last", type: "boolean", defaultValue: false },
  { name: "longLabel", label: "long first label", type: "boolean", defaultValue: false },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="CheckboxGroup only names the set and lays it out; each Checkbox keeps its own state, so there is no group value, onChange, error or disabled prop. Unchecked boxes keep a visible edge so they read against any surface."
      code={(v) => {
        const count = Number(v.count);
        return snippet({
          imports: [{ names: ["Checkbox", "CheckboxGroup"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "CheckboxGroup",
            defaults: { orientation: "vertical" },
            props: {
              label: String(v.label) || undefined,
              orientation: String(v.orientation),
            },
            children: CHANNELS.slice(0, count).map((channel, index) =>
              jsx({
                name: "Checkbox",
                defaults: { defaultChecked: false, disabled: false },
                props: {
                  defaultChecked: index === 0 && Boolean(v.checkFirst),
                  disabled: index === count - 1 && Boolean(v.disableLast),
                },
                children: index === 0 && v.longLabel ? LONG_CHANNEL : channel,
              }),
            ),
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const count = Number(v.count);
        return (
          <div className="max-w-full">
            <CheckboxGroup
              key={String(v.checkFirst)}
              {...(String(v.label) ? { label: String(v.label) } : {})}
              orientation={v.orientation as "vertical" | "horizontal"}
            >
              {CHANNELS.slice(0, count).map((channel, index) => (
                <Checkbox
                  defaultChecked={index === 0 && Boolean(v.checkFirst)}
                  disabled={index === count - 1 && Boolean(v.disableLast)}
                  key={channel}
                >
                  {index === 0 && v.longLabel ? LONG_CHANNEL : channel}
                </Checkbox>
              ))}
            </CheckboxGroup>
          </div>
        );
      }}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "none", label: "None checked" },
        { id: "some", label: "Some checked" },
        { id: "all", label: "All checked" },
        { id: "disabled-item", label: "One disabled" },
        { id: "disabled", label: "All disabled" },
        { id: "unlabelled", label: "No label" },
      ]}
      note="CheckboxGroup has no loading, invalid or group-level disabled state: disabling the set means disabling each Checkbox, as the All disabled column does. Without a label the group renders no heading and has no accessible name. Hover and Tab are live; every box is its own tab stop."
      render={(orientation, state) => (
        <CheckboxGroup
          {...(state === "unlabelled" ? {} : { label: "Notifications" })}
          orientation={orientation as "vertical" | "horizontal"}
        >
          <Checkbox
            defaultChecked={
              state === "some" ||
              state === "all" ||
              state === "disabled-item" ||
              state === "disabled"
            }
            disabled={state === "disabled"}
          >
            Email
          </Checkbox>
          <Checkbox defaultChecked={state === "all"} disabled={state === "disabled"}>
            SMS
          </Checkbox>
          <Checkbox
            defaultChecked={state === "all"}
            disabled={state === "disabled" || state === "disabled-item"}
          >
            Push
          </Checkbox>
        </CheckboxGroup>
      )}
      rows={[
        { id: "vertical", label: "Vertical" },
        { id: "horizontal", label: "Horizontal" },
      ]}
      rowsLabel="Orientation"
    />
  );
}
