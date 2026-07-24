"use client";

/**
 * Forge runner select — DS compound listbox (styled popup), not native OS chrome.
 * Drop-in for the former native <select data-allow-native> RunnerSelect API.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";
import type { ReactNode } from "react";

import { optionsFromChildren, type RunnerSelectOption } from "@/components/runner-select-options";

export type { RunnerSelectOption };
export { optionsFromChildren };

export function RunnerSelect({
  label,
  id,
  value,
  onChange,
  children,
  className,
  options: optionsProp,
}: {
  label?: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
  className?: string;
  /** Prefer this over <option> children when you already have a list. */
  options?: readonly RunnerSelectOption[];
}) {
  const options = optionsProp?.length
    ? optionsProp.map((o) => ({ ...o, value: String(o.value) }))
    : optionsFromChildren(children);

  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  const selectedLabel = items[value] ?? value;
  const labelId = id ? `${id}-label` : undefined;

  const control = (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next == null) return;
        onChange(String(next));
      }}
      items={items}
    >
      <SelectTrigger
        id={id}
        // DS trigger defaults to w-full; runners sit in compact toolbars.
        className={className ?? "w-auto min-w-[10rem]"}
        aria-labelledby={label && labelId ? labelId : undefined}
        aria-label={!label ? id : undefined}
      >
        <SelectValue placeholder={selectedLabel || "选择…"}>
          {() => selectedLabel || "选择…"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!label) return control;

  return (
    <div className="flex flex-col gap-1.5 text-sm text-[var(--neutral-11)]">
      <span className="text-xs font-medium" id={labelId}>
        {label}
      </span>
      {control}
    </div>
  );
}
