"use client";
// @primitive-exempt: knob chips are aria-pressed segmented toggles and Reset is a quiet text action; neither maps to a Button variant.

/**
 * Live playground: knobs drive a real component and the code beside it.
 *
 * One state object feeds both `render` and `code`, so the snippet cannot say
 * something the preview is not doing. The component page supplies the knobs
 * (their options come from the library's own variant maps, not from a list
 * typed here), a render function, and a code function built on `jsx()`.
 *
 * Layout: preview and code on the left, knobs on the right at `lg`. Below that
 * the order is preview, knobs, code — the knobs belong next to what they move.
 */

import { RefreshCounterClockwise } from "@nebutra/icons";
import { Input, Select, Toggle } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";
import { CodeBlock } from "./component-code";

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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      {/* biome-ignore lint/a11y/useSemanticElements: a labelled stage, not a form fieldset */}
      <div
        aria-label="Preview"
        className={cn(
          "flex min-h-56 min-w-0 items-center justify-center overflow-auto rounded-lg border border-border bg-card p-6 lg:col-start-1",
          stageClassName,
        )}
        role="group"
      >
        <div className="min-w-0 max-w-full">{render(values)}</div>
      </div>

      <aside
        aria-label="Props"
        className="flex flex-col rounded-lg border border-border bg-card lg:col-start-2 lg:row-span-2 lg:row-start-1"
      >
        <div className="flex items-center justify-between gap-2 border-border border-b bg-background px-3 py-1.5">
          <span className="text-muted-foreground text-xs">Props</span>
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            disabled={!dirty}
            onClick={() => setValues(defaultsOf(knobs))}
            type="button"
          >
            <RefreshCounterClockwise aria-hidden className="size-3.5" />
            Reset
          </button>
        </div>
        <div className="flex flex-col gap-4 p-4">
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

      <div className="flex min-w-0 flex-col gap-2 lg:col-start-1">
        <CodeBlock code={code(values)} label="Code" />
        {caption ? <p className="m-0 text-muted-foreground text-xs">{caption}</p> : null}
      </div>
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
        <Toggle checked={value === true} onChange={(next) => onChange(next)} size="small">
          <span className="font-mono text-xs">{label}</span>
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
      <span className="font-medium text-foreground text-sm" id={id}>
        {label}
      </span>
      {/* biome-ignore lint/a11y/useSemanticElements: a labelled button group, not a form fieldset */}
      <div aria-labelledby={id} className="flex flex-wrap gap-1" role="group">
        {knob.options.map((option) => (
          <button
            aria-pressed={value === option}
            className={cn(
              "h-7 rounded-[var(--radius-sm)] border px-2.5 font-medium font-mono text-xs transition-colors duration-micro",
              value === option
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      {knob.hint ? <Hint>{knob.hint}</Hint> : null}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-muted-foreground text-xs">{children}</p>;
}
