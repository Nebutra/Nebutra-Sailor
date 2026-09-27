"use client";

import {
  PRESET_DENSITIES,
  PRESET_HEADINGS,
  PRESET_MODES,
  PRESET_MONOS,
  PRESET_NEUTRALS,
  PRESET_RADII,
  PRESET_SANS,
  PRESET_WEIGHTS,
  type Preset,
} from "@nebutra/tokens/preset";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
} from "@nebutra/ui/primitives";
import type { ReactNode } from "react";

/**
 * The knobs a preset turns — one control per knob, each offering exactly the
 * choices the preset code can store (@nebutra/tokens/preset knobs). "base"
 * everywhere means "what the language you started from does".
 */

type Knob = Exclude<keyof Preset, "base">;

/** A handful of starting points; any colour can be typed or picked. */
const SWATCHES = [
  "#2e65ee",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#18191c",
];

const HEX_RE = /^#[0-9a-f]{6}$/i;

const label = (value: string | number) => (value === "base" ? "Language" : String(value));

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-foreground text-xs">{title}</span>
        {hint ? <span className="text-muted-foreground text-2xs">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={ariaLabel}
      value={String(value)}
      onValueChange={(next) => {
        const match = options.find((o) => String(o) === next);
        if (match !== undefined) onChange(match);
      }}
      className="flex w-full rounded-[var(--radius-md)] border border-border bg-muted p-0.5"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={String(option)}
          value={String(option)}
          className="h-7 flex-1 rounded-[calc(var(--radius-md)-2px)] px-1.5 text-2xs capitalize hover:text-foreground"
        >
          {label(option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function Choice<T extends string | number>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => {
        const match = options.find((o) => String(o) === next);
        if (match !== undefined) onChange(match);
      }}
    >
      <SelectTrigger size="small" className="h-8 w-full" aria-label={ariaLabel}>
        <SelectValue>{label(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={String(option)} value={String(option)}>
            {label(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StudioKnobs({
  preset,
  onChange,
}: {
  preset: Preset;
  onChange: (next: Preset) => void;
}) {
  const set = <K extends Knob>(key: K, value: Preset[K] | "base" | undefined) => {
    const next: Record<string, unknown> = { ...preset };
    if (value === undefined || value === "base") delete next[key];
    else next[key] = value;
    onChange(next as unknown as Preset);
  };
  const color = preset.brandColor;

  return (
    <div className="grid min-w-0 gap-5">
      <Row title="Brand colour" hint="Buttons, focus, links">
        <ToggleGroup
          type="single"
          aria-label="Brand colour"
          value={color ?? "base"}
          onValueChange={(next) => {
            if (!next) return;
            if (typeof next === "string") set("brandColor", next === "base" ? undefined : next);
          }}
          className="flex flex-wrap items-center gap-1.5 bg-transparent p-0"
        >
          <ToggleGroupItem
            value="base"
            aria-label="Use the language's own colour"
            className="h-7 rounded-full border border-border px-2.5 text-2xs data-[state=on]:border-foreground"
          >
            Language
          </ToggleGroupItem>
          {SWATCHES.map((swatch) => (
            <ToggleGroupItem
              key={swatch}
              value={swatch}
              aria-label={`Brand colour ${swatch}`}
              className="size-7 min-w-0 rounded-full border-2 border-transparent p-0 data-[state=on]:border-foreground"
              style={{ background: swatch }}
            />
          ))}
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <input
            data-allow-native
            type="color"
            aria-label="Pick any brand colour"
            value={color ?? "#2e65ee"}
            onChange={(event) => set("brandColor", event.target.value.toLowerCase())}
            className="size-8 shrink-0 cursor-pointer rounded-[var(--radius-md)] border border-border bg-transparent p-0.5"
          />
          <Input
            aria-label="Brand colour hex"
            size="sm"
            placeholder="#rrggbb"
            value={color ?? ""}
            onValueChange={(value) => {
              const hex = value.startsWith("#") ? value : `#${value}`;
              if (HEX_RE.test(hex)) set("brandColor", hex.toLowerCase());
              if (value === "") set("brandColor", undefined);
            }}
            className="font-mono"
          />
        </div>
      </Row>

      <Row title="Neutrals" hint="Surface and text temperature">
        <Segmented
          ariaLabel="Neutrals"
          value={preset.neutral ?? "base"}
          options={PRESET_NEUTRALS}
          onChange={(v) => set("neutral", v)}
        />
      </Row>

      <Row title="Radius">
        <Segmented
          ariaLabel="Radius"
          value={preset.radius ?? "base"}
          options={PRESET_RADII}
          onChange={(v) => set("radius", v)}
        />
      </Row>

      <Row title="Density">
        <Segmented
          ariaLabel="Density"
          value={preset.density ?? "base"}
          options={PRESET_DENSITIES}
          onChange={(v) => set("density", v)}
        />
      </Row>

      <Row title="Body face">
        <Choice
          ariaLabel="Body face"
          value={preset.sans ?? "base"}
          options={PRESET_SANS}
          onChange={(v) => set("sans", v)}
        />
      </Row>

      <Row title="Heading face">
        <Choice
          ariaLabel="Heading face"
          value={preset.heading ?? "base"}
          options={PRESET_HEADINGS}
          onChange={(v) => set("heading", v)}
        />
      </Row>

      <Row title="Heading weight">
        <Segmented
          ariaLabel="Heading weight"
          value={preset.headingWeight ?? "base"}
          options={PRESET_WEIGHTS}
          onChange={(v) => set("headingWeight", v)}
        />
      </Row>

      <Row title="Code face">
        <Choice
          ariaLabel="Code face"
          value={preset.mono ?? "base"}
          options={PRESET_MONOS}
          onChange={(v) => set("mono", v)}
        />
      </Row>

      <Row title="First visit" hint="Mode a visitor sees first">
        <Segmented
          ariaLabel="Default mode"
          value={preset.mode ?? "base"}
          options={PRESET_MODES}
          onChange={(v) => set("mode", v)}
        />
      </Row>
    </div>
  );
}
