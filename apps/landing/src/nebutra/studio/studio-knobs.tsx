"use client";

import { ChevronDown, RotateCounterClockwise } from "@nebutra/icons";
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
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { type ReactNode, useState } from "react";

/**
 * The knobs a preset turns — one control per knob, each offering exactly the
 * choices the preset code can store (@nebutra/tokens/preset knobs).
 *
 * Four are in front (accent, neutrals, radius, density): the ones that change
 * what a page reads as. The rest wait under "More". A knob left alone follows
 * the language and says "Default"; a knob turned offers "Reset" instead.
 */

type Knob = Exclude<keyof Preset, "base">;

/** A handful of starting points; any colour can be picked or typed. */
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

/** Knobs that sit under "More". */
const SECONDARY_KNOBS: readonly Knob[] = ["sans", "heading", "headingWeight", "mono", "mode"];

const LABELS: Record<string, string> = {
  base: "Default",
  none: "None",
  sm: "S",
  md: "M",
  lg: "L",
  full: "Full",
  cool: "Cool",
  neutral: "Neutral",
  warm: "Warm",
  compact: "Compact",
  comfortable: "Comfortable",
  spacious: "Spacious",
  light: "Light",
  dark: "Dark",
};

const label = (value: string | number) => LABELS[String(value)] ?? String(value);

/** How many knobs differ from the language. */
export const changedKnobs = (preset: Preset) =>
  (Object.keys(preset) as Array<keyof Preset>).filter((k) => k !== "base").length;

function Row({
  title,
  changed,
  onReset,
  children,
}: {
  title: string;
  changed: boolean;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex h-6 items-center justify-between gap-3">
        <span className="font-medium text-foreground text-xs">{title}</span>
        {changed ? (
          <Button
            type="button"
            variant="ghost"
            size="tiny"
            onClick={onReset}
            aria-label={`Reset ${title.toLowerCase()} to the default`}
            prefix={<RotateCounterClockwise />}
            className="-mr-2 text-muted-foreground hover:text-foreground"
          >
            Reset
          </Button>
        ) : (
          <span className="text-2xs text-muted-foreground">Default</span>
        )}
      </div>
      {children}
    </div>
  );
}

/** A segmented choice. Untouched ("base") shows nothing pressed: the language decides. */
function Segmented<T extends string | number>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T | undefined;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const choices = options.filter((o) => o !== "base");
  return (
    <ToggleGroup
      type="single"
      aria-label={ariaLabel}
      value={value === undefined ? "" : String(value)}
      onValueChange={(next) => {
        const match = choices.find((o) => String(o) === next);
        if (match !== undefined) onChange(match);
      }}
      className="flex w-full rounded-[var(--radius-md)] border border-border bg-muted p-0.5"
    >
      {choices.map((option) => (
        <ToggleGroupItem
          key={String(option)}
          value={String(option)}
          className="h-7 min-w-0 flex-1 rounded-[calc(var(--radius-md)-2px)] px-1.5 text-2xs hover:text-foreground"
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
  value: T | "base";
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
  const reset = (key: Knob) => () => set(key, undefined);
  const color = preset.brandColor;
  const custom = color !== undefined && !SWATCHES.includes(color);
  const moreChanged = SECONDARY_KNOBS.filter((k) => preset[k] !== undefined).length;
  const [moreOpen, setMoreOpen] = useState(moreChanged > 0);

  return (
    <div className="grid min-w-0 gap-5">
      <Row title="Accent colour" changed={color !== undefined} onReset={reset("brandColor")}>
        <div className="flex flex-wrap items-center gap-1.5">
          <ToggleGroup
            type="single"
            aria-label="Accent colour"
            value={custom ? "custom" : (color ?? "")}
            onValueChange={(next) => {
              if (typeof next === "string" && HEX_RE.test(next)) set("brandColor", next);
            }}
            className="flex flex-wrap items-center gap-1.5 bg-transparent p-0"
          >
            {SWATCHES.map((swatch) => (
              <ToggleGroupItem
                key={swatch}
                value={swatch}
                aria-label={`Accent ${swatch}`}
                className="size-7 min-w-0 rounded-full border-2 border-transparent p-0 ring-1 ring-border ring-inset data-[state=on]:border-foreground"
                style={{ background: swatch }}
              />
            ))}
          </ToggleGroup>
          {/* Any colour: the swatch opens the system picker. */}
          <label
            className={cn(
              "relative grid size-7 cursor-pointer place-items-center rounded-full border-2",
              custom ? "border-foreground" : "border-transparent",
            )}
            style={{
              background: custom
                ? color
                : "conic-gradient(in oklch longer hue, oklch(0.72 0.19 0), oklch(0.72 0.19 0))",
            }}
          >
            <span className="sr-only">Pick any accent colour</span>
            <input
              data-allow-native
              type="color"
              value={color ?? "#2e65ee"}
              onChange={(event) => set("brandColor", event.target.value.toLowerCase())}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </Row>

      <Row title="Neutrals" changed={preset.neutral !== undefined} onReset={reset("neutral")}>
        <Segmented
          ariaLabel="Neutrals"
          value={preset.neutral}
          options={PRESET_NEUTRALS}
          onChange={(v) => set("neutral", v)}
        />
      </Row>

      <Row title="Corner radius" changed={preset.radius !== undefined} onReset={reset("radius")}>
        <Segmented
          ariaLabel="Corner radius"
          value={preset.radius}
          options={PRESET_RADII}
          onChange={(v) => set("radius", v)}
        />
      </Row>

      <Row title="Density" changed={preset.density !== undefined} onReset={reset("density")}>
        <Segmented
          ariaLabel="Density"
          value={preset.density}
          options={PRESET_DENSITIES}
          onChange={(v) => set("density", v)}
        />
      </Row>

      <Collapsible
        open={moreOpen}
        onOpenChange={setMoreOpen}
        className="border-border/70 border-t pt-3"
      >
        <CollapsibleTrigger className="flex h-8 w-full items-center justify-between rounded-[var(--radius-md)] text-left font-medium text-muted-foreground text-xs hover:text-foreground">
          <span>
            More — type, exact colour, first visit
            {moreChanged > 0 ? (
              <span className="ml-1.5 text-foreground">· {moreChanged} changed</span>
            ) : null}
          </span>
          <ChevronDown
            className={cn("size-4 transition-transform duration-flow", moreOpen && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-5 pt-3">
            <Row title="Exact accent" changed={color !== undefined} onReset={reset("brandColor")}>
              <Input
                aria-label="Accent colour hex"
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
            </Row>
            <Row title="Body face" changed={preset.sans !== undefined} onReset={reset("sans")}>
              <Choice
                ariaLabel="Body face"
                value={preset.sans ?? "base"}
                options={PRESET_SANS}
                onChange={(v) => set("sans", v)}
              />
            </Row>
            <Row
              title="Heading face"
              changed={preset.heading !== undefined}
              onReset={reset("heading")}
            >
              <Choice
                ariaLabel="Heading face"
                value={preset.heading ?? "base"}
                options={PRESET_HEADINGS}
                onChange={(v) => set("heading", v)}
              />
            </Row>
            <Row
              title="Heading weight"
              changed={preset.headingWeight !== undefined}
              onReset={reset("headingWeight")}
            >
              <Segmented
                ariaLabel="Heading weight"
                value={preset.headingWeight}
                options={PRESET_WEIGHTS}
                onChange={(v) => set("headingWeight", v)}
              />
            </Row>
            <Row title="Code face" changed={preset.mono !== undefined} onReset={reset("mono")}>
              <Choice
                ariaLabel="Code face"
                value={preset.mono ?? "base"}
                options={PRESET_MONOS}
                onChange={(v) => set("mono", v)}
              />
            </Row>
            <Row title="First visit in" changed={preset.mode !== undefined} onReset={reset("mode")}>
              <Segmented
                ariaLabel="Mode a visitor sees first"
                value={preset.mode}
                options={PRESET_MODES}
                onChange={(v) => set("mode", v)}
              />
            </Row>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
