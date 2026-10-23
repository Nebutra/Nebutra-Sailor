"use client";

/**
 * Live playground: knobs drive a real component and the code beside it.
 *
 * One state object feeds both `render` and `code`, so the snippet cannot say
 * something the preview is not doing. The component page supplies the knobs
 * (their options come from the library's own variant maps, not from a list
 * typed here), a render function, and a code function built on `jsx()`.
 *
 * Layout: one workbench, one frame. Stage and code stack on the left, the props
 * inspector sits on the right at `lg`, and hairlines — not boxes — divide them.
 * The stage is a dot matrix canvas. Below `lg` the order is preview, props,
 * code: the knobs belong next to what they move.
 */

import { RefreshCounterClockwise } from "@nebutra/icons";
import { Button, Input, Select, Toggle } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";
import { CodeBlock } from "./component-code";
import { Segmented } from "./segmented";

export type KnobValue = string | boolean;
export type KnobValues = Record<string, KnobValue>;

interface KnobBase {
  name: string;
  /** Defaults to the name. */
  label?: string;
  /** One line under the control. */
  hint?: string;
}

export type Knob =
  | (KnobBase & {
      type: "select";
      options: readonly string[];
      defaultValue: string;
    })
  | (KnobBase & { type: "boolean"; defaultValue: boolean })
  | (KnobBase & { type: "text"; defaultValue: string; placeholder?: string });

/** Segmented control up to this many options; a Select beyond it. */
const SEGMENTED_MAX = 5;

export function defaultsOf(knobs: readonly Knob[]): KnobValues {
  return Object.fromEntries(knobs.map((knob) => [knob.name, knob.defaultValue]));
}

export function ComponentPlayground({
  knobs,
  render,
  code,
  stageClassName,
  caption,
}: {
  knobs: readonly Knob[];
  render: (values: KnobValues) => React.ReactNode;
  code: (values: KnobValues) => string;
  /** Extra classes for the preview stage, e.g. a wider stage for a table. */
  stageClassName?: string;
  /** What the stage is showing when that is not obvious. */
  caption?: React.ReactNode;
}) {
  const [values, setValues] = React.useState<KnobValues>(() => defaultsOf(knobs));
  const set = (name: string, value: KnobValue) => setValues((prev) => ({ ...prev, [name]: value }));
  const dirty = knobs.some((knob) => values[knob.name] !== knob.defaultValue);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="overflow-hidden rounded-card border border-hairline bg-card shadow-xs">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:grid-rows-[1fr_auto]">
          {/* biome-ignore lint/a11y/useSemanticElements: a labelled stage, not a form fieldset */}
          <div
            aria-label="Preview"
            className={cn(
              "bg-dot-matrix flex min-h-56 min-w-0 items-center justify-center overflow-auto p-6 lg:col-start-1",
              stageClassName,
            )}
            role="group"
          >
            <div className="min-w-0 max-w-full">{render(values)}</div>
          </div>

          <aside
            aria-label="Props"
            className="flex min-w-0 flex-col border-hairline border-t lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[40rem] lg:border-t-0 lg:border-l"
          >
            <div className="flex min-h-9 shrink-0 items-center justify-between gap-2 border-hairline border-b bg-muted/40 py-1 pr-2 pl-3">
              <span className="font-medium text-muted-foreground text-xs">Props</span>
              <Button
                className="text-muted-foreground"
                disabled={!dirty}
                onClick={() => setValues(defaultsOf(knobs))}
                size="tiny"
                variant="ghost"
              >
                <RefreshCounterClockwise aria-hidden className="size-3.5" />
                Reset
              </Button>
            </div>
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
              {knobs.map((knob) => (
                <KnobControl
                  key={knob.name}
                  knob={knob}
                  onChange={(value) => set(knob.name, value)}
                  value={values[knob.name] ?? knob.defaultValue}
                />
              ))}
            </div>
          </aside>

          <CodeBlock
            bare
            className="border-hairline border-t lg:col-start-1"
            code={code(values)}
            label="Code"
          />
        </div>
      </div>
      {caption ? <p className="m-0 text-muted-foreground text-xs">{caption}</p> : null}
    </div>
  );
}

function KnobControl({
  knob,
  value,
  onChange,
}: {
  knob: Knob;
  value: KnobValue;
  onChange: (value: KnobValue) => void;
}) {
  const label = knob.label ?? knob.name;
  const id = React.useId();

  if (knob.type === "boolean") {
    return (
      <div className="flex flex-col gap-1">
        {/* Label left, switch on the right edge: every boolean row shares one column. */}
        <Toggle
          checked={value === true}
          className="w-full justify-between"
          onChange={(next) => onChange(next)}
          size="small"
        >
          <span className="font-medium text-foreground text-sm">{label}</span>
        </Toggle>
        {knob.hint ? <Hint>{knob.hint}</Hint> : null}
      </div>
    );
  }

  if (knob.type === "text") {
    return (
      <div className="flex flex-col gap-1">
        <Input
          id={id}
          label={label}
          onValueChange={onChange}
          placeholder={knob.placeholder}
          size="sm"
          value={String(value)}
        />
        {knob.hint ? <Hint>{knob.hint}</Hint> : null}
      </div>
    );
  }

  if (knob.options.length > SEGMENTED_MAX) {
    return (
      <div className="flex flex-col gap-1">
        <Select
          id={id}
          label={label}
          onValueChange={(next) => next !== null && onChange(next)}
          options={knob.options.map((option) => ({ value: option, label: option }))}
          size="small"
          value={String(value)}
        />
        {knob.hint ? <Hint>{knob.hint}</Hint> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-foreground text-sm">{label}</span>
      <Segmented
        label={label}
        mono
        onValueChange={onChange}
        options={knob.options}
        value={String(value)}
      />
      {knob.hint ? <Hint>{knob.hint}</Hint> : null}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-muted-foreground text-xs">{children}</p>;
}
