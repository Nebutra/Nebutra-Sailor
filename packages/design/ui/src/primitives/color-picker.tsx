"use client";

import { Droplet } from "@nebutra/icons";
import * as React from "react";
import { cn } from "../utils/cn";
import {
  type ColorFormat,
  clampNumber,
  formatColor,
  formatOklch,
  type Hsva,
  hsvaToRgba,
  parseColor,
  parseHex,
  type Rgba,
  rgbaToHex,
  rgbToHsv,
  roundNumber,
  wrapHue,
} from "./color-math";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import { type ColorPickerLabels, useUiLabels } from "./ui-labels";

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export type { ColorFormat } from "./color-math";

export interface ColorPickerDetails {
  /** Lowercase `#rrggbb`, or `#rrggbbaa` when `alpha` is on and opacity < 1. */
  hex: string;
  /** CSS `oklch(L% C H)` for the same colour. */
  oklch: string;
  rgba: Rgba;
  hsva: Hsva;
}

export type { ColorPickerLabels };

export interface ColorPickerProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange" | "defaultValue"> {
  /** Controlled value: hex (3, 4, 6 or 8 digits). */
  value?: string | undefined;
  defaultValue?: string | undefined;
  /** Fires on every change, including each pointer move while dragging. */
  onChange?: (hex: string, details: ColorPickerDetails) => void;
  /** Fires when an interaction ends: pointer release, key press, committed text, swatch, eyedropper. */
  onChangeComplete?: (hex: string, details: ColorPickerDetails) => void;
  /** Adds an opacity slider and 8-digit hex output. */
  alpha?: boolean;
  /** Preset row, hex strings. */
  swatches?: readonly string[];
  disabled?: boolean;
  format?: ColorFormat;
  defaultFormat?: ColorFormat;
  onFormatChange?: (format: ColorFormat) => void;
  /** Show the EyeDropper button where the browser supports it (default true). */
  eyeDropper?: boolean;
  /** Translated strings; every key is optional. */
  labels?: Partial<ColorPickerLabels> | undefined;
}

const FALLBACK = "#2e65ee";
const FORMATS: readonly ColorFormat[] = ["hex", "rgb", "oklch"];
const FORMAT_LABEL: Record<ColorFormat, string> = { hex: "HEX", rgb: "RGB", oklch: "OKLCH" };

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function toHsva(value: string | undefined, alpha: boolean, fallbackHue = 0): Hsva {
  const rgba = parseHex(value ?? "") ?? (parseHex(FALLBACK) as Rgba);
  const hsv = rgbToHsv(rgba);
  return {
    h: hsv.s === 0 || hsv.v === 0 ? fallbackHue : hsv.h,
    s: hsv.s,
    v: hsv.v,
    a: alpha ? rgba.a : 1,
  };
}

function detailsOf(hsva: Hsva, alpha: boolean): ColorPickerDetails {
  const rgba = hsvaToRgba(hsva);
  return {
    hex: rgbaToHex(rgba, alpha),
    oklch: formatOklch(rgba, rgba.a, alpha),
    rgba,
    hsva,
  };
}

/** Per-instance values reach the stylesheet through custom properties only. */
type CpVars = React.CSSProperties;

const CHECKER =
  "bg-[length:8px_8px] bg-[image:conic-gradient(var(--neutral-5)_25%,var(--neutral-2)_0_50%,var(--neutral-5)_0_75%,var(--neutral-2)_0)]";

const thumbClass = cn(
  "absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none",
  // allow-palette: the thumb sits on arbitrary user colours, so it is white with a dark hairline in both themes
  "border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.45),0_1px_3px_rgb(0_0_0/0.35)]",
  "transition-transform duration-micro ease-out motion-reduce:transition-none",
  "data-[dragging=true]:scale-110",
);

/** Pointer capture + 0..1 coordinates for one draggable surface. */
function useDrag(
  onMove: (x: number, y: number) => void,
  onEnd: () => void,
  disabled: boolean | undefined,
  focusTarget: React.RefObject<HTMLElement | null>,
) {
  const [dragging, setDragging] = React.useState(false);
  const active = React.useRef(false);

  const read = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.width ? (event.clientX - rect.left) / rect.width : 0;
    const y = rect.height ? (event.clientY - rect.top) / rect.height : 0;
    onMove(clampNumber(x, 0, 1), clampNumber(y, 0, 1));
  };

  return {
    dragging,
    handlers: {
      onPointerDown(event: React.PointerEvent<HTMLElement>) {
        if (disabled || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        active.current = true;
        setDragging(true);
        focusTarget.current?.focus({ preventScroll: true });
        read(event);
      },
      onPointerMove(event: React.PointerEvent<HTMLElement>) {
        if (active.current) read(event);
      },
      onPointerUp(event: React.PointerEvent<HTMLElement>) {
        if (!active.current) return;
        active.current = false;
        setDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        onEnd();
      },
      onPointerCancel() {
        if (!active.current) return;
        active.current = false;
        setDragging(false);
        onEnd();
      },
    },
  };
}

/** Arrow / Home / End / Page keys for a 1-D slider; returns the next value or null. */
function stepKey(
  event: React.KeyboardEvent,
  value: number,
  min: number,
  max: number,
  step: number,
): number | null {
  const big = event.shiftKey ? 10 : 1;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowUp":
      return clampNumber(value + step * big, min, max);
    case "ArrowLeft":
    case "ArrowDown":
      return clampNumber(value - step * big, min, max);
    case "PageUp":
      return clampNumber(value + step * 10, min, max);
    case "PageDown":
      return clampNumber(value - step * 10, min, max);
    case "Home":
      return min;
    case "End":
      return max;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

interface SurfaceProps {
  hsva: Hsva;
  disabled?: boolean | undefined;
  labels: ColorPickerLabels;
  commit: (next: Hsva, complete: boolean) => void;
  complete: () => void;
}

function SaturationArea({ hsva, disabled, labels, commit, complete }: SurfaceProps) {
  const thumb = React.useRef<HTMLDivElement>(null);
  const { dragging, handlers } = useDrag(
    (x, y) => commit({ ...hsva, s: x, v: 1 - y }, false),
    complete,
    disabled,
    thumb,
  );
  const s = Math.round(hsva.s * 100);
  const v = Math.round(hsva.v * 100);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    const big = event.shiftKey ? 0.1 : 0.01;
    let next: Hsva | null = null;
    if (event.key === "ArrowRight") next = { ...hsva, s: clampNumber(hsva.s + big, 0, 1) };
    else if (event.key === "ArrowLeft") next = { ...hsva, s: clampNumber(hsva.s - big, 0, 1) };
    else if (event.key === "ArrowUp") next = { ...hsva, v: clampNumber(hsva.v + big, 0, 1) };
    else if (event.key === "ArrowDown") next = { ...hsva, v: clampNumber(hsva.v - big, 0, 1) };
    else if (event.key === "PageUp") next = { ...hsva, v: clampNumber(hsva.v + 0.1, 0, 1) };
    else if (event.key === "PageDown") next = { ...hsva, v: clampNumber(hsva.v - 0.1, 0, 1) };
    else if (event.key === "Home") next = { ...hsva, s: 0 };
    else if (event.key === "End") next = { ...hsva, s: 1 };
    if (!next) return;
    event.preventDefault();
    commit(next, true);
  };

  return (
    <div
      data-slot="color-picker-area"
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "relative h-40 w-full touch-none select-none rounded-[var(--radius-md)] ring-1 ring-inset ring-border data-[disabled]:opacity-50",
        "bg-[color:hsl(var(--cp-hue)_100%_50%)]",
        // allow-palette: the area is a fixed white/black overlay over the current hue, in both themes
        "bg-[image:linear-gradient(to_top,rgb(0_0_0),rgb(0_0_0/0)),linear-gradient(to_right,rgb(255_255_255),rgb(255_255_255/0))]",
      )}
      style={{ "--cp-hue": hsva.h } as CpVars}
      {...handlers}
    >
      <div
        ref={thumb}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={labels.area}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={s}
        aria-valuetext={`${labels.saturation} ${s}%, ${labels.brightness} ${v}%`}
        aria-disabled={disabled || undefined}
        data-dragging={dragging}
        className={cn(
          thumbClass,
          "left-[var(--cp-x)] top-[var(--cp-y)] bg-[color:var(--cp-color)]",
        )}
        style={
          {
            "--cp-x": `${hsva.s * 100}%`,
            "--cp-y": `${(1 - hsva.v) * 100}%`,
            "--cp-color": rgbaToHex(hsvaToRgba({ ...hsva, a: 1 })),
          } as CpVars
        }
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

function HueSlider({ hsva, disabled, labels, commit, complete }: SurfaceProps) {
  const thumb = React.useRef<HTMLDivElement>(null);
  const { dragging, handlers } = useDrag(
    (x) => commit({ ...hsva, h: Math.min(359.99, x * 360) }, false),
    complete,
    disabled,
    thumb,
  );
  const hue = Math.round(hsva.h);
  return (
    <div
      data-slot="color-picker-hue"
      className={cn(
        "relative h-3 w-full touch-none select-none rounded-full ring-1 ring-inset ring-border data-[disabled]:opacity-50",
        "bg-[image:linear-gradient(to_right,hsl(0_100%_50%),hsl(60_100%_50%),hsl(120_100%_50%),hsl(180_100%_50%),hsl(240_100%_50%),hsl(300_100%_50%),hsl(360_100%_50%))]",
      )}
      data-disabled={disabled ? "" : undefined}
      {...handlers}
    >
      <div
        ref={thumb}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={labels.hue}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={hue}
        aria-valuetext={`${hue}°`}
        aria-disabled={disabled || undefined}
        data-dragging={dragging}
        className={cn(
          thumbClass,
          "top-1/2 left-[var(--cp-x)] bg-[color:hsl(var(--cp-hue)_100%_50%)]",
        )}
        style={{ "--cp-x": `${(hsva.h / 360) * 100}%`, "--cp-hue": hsva.h } as CpVars}
        onKeyDown={(event) => {
          if (disabled) return;
          const next = stepKey(event, hsva.h, 0, 360, 1);
          if (next === null) return;
          event.preventDefault();
          commit({ ...hsva, h: wrapHue(next === 360 ? 359.99 : next) }, true);
        }}
      />
    </div>
  );
}

function AlphaSlider({ hsva, disabled, labels, commit, complete }: SurfaceProps) {
  const thumb = React.useRef<HTMLDivElement>(null);
  const { dragging, handlers } = useDrag(
    (x) => commit({ ...hsva, a: roundNumber(x, 2) }, false),
    complete,
    disabled,
    thumb,
  );
  const pct = Math.round(hsva.a * 100);
  const solid = rgbaToHex(hsvaToRgba({ ...hsva, a: 1 }));
  return (
    <div
      data-slot="color-picker-alpha"
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "relative h-3 w-full touch-none select-none rounded-full ring-1 ring-inset ring-border data-[disabled]:opacity-50",
        CHECKER,
      )}
      {...handlers}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[image:linear-gradient(to_right,transparent,var(--cp-color))]"
        style={{ "--cp-color": solid } as CpVars}
      />
      <div
        ref={thumb}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={labels.alpha}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}%`}
        aria-disabled={disabled || undefined}
        data-dragging={dragging}
        className={cn(thumbClass, "top-1/2 left-[var(--cp-x)] bg-[color:var(--cp-color)]")}
        style={{ "--cp-x": `${hsva.a * 100}%`, "--cp-color": solid } as CpVars}
        onKeyDown={(event) => {
          if (disabled) return;
          const next = stepKey(event, pct, 0, 100, 1);
          if (next === null) return;
          event.preventDefault();
          commit({ ...hsva, a: next / 100 }, true);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EyeDropper                                                                  */
/* -------------------------------------------------------------------------- */

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

function getEyeDropper(): EyeDropperCtor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper ?? null;
}

function useEyeDropperSupport(enabled: boolean) {
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => {
    setSupported(enabled && getEyeDropper() !== null);
  }, [enabled]);
  return supported;
}

/* -------------------------------------------------------------------------- */
/* ColorPicker                                                                 */
/* -------------------------------------------------------------------------- */

function ColorPicker({
  value,
  defaultValue = FALLBACK,
  onChange,
  onChangeComplete,
  alpha = false,
  swatches,
  disabled,
  format: formatProp,
  defaultFormat = "hex",
  onFormatChange,
  eyeDropper = true,
  labels: labelOverrides,
  className,
  ...props
}: ColorPickerProps) {
  const labels = useUiLabels("colorPicker", labelOverrides);
  const [hsva, setHsvaState] = React.useState<Hsva>(() => toHsva(value ?? defaultValue, alpha));
  const hsvaRef = React.useRef(hsva);
  const [formatState, setFormatState] = React.useState<ColorFormat>(defaultFormat);
  const format = formatProp ?? formatState;
  const [draft, setDraft] = React.useState<string | null>(null);
  const canPick = useEyeDropperSupport(eyeDropper && !disabled);
  const lastHex = React.useRef(detailsOf(hsva, alpha).hex);

  const setHsva = (next: Hsva) => {
    hsvaRef.current = next;
    setHsvaState(next);
  };

  // Controlled: follow `value` when it names a different colour than the one we hold.
  React.useEffect(() => {
    if (value === undefined) return;
    const parsed = parseHex(value);
    if (!parsed) return;
    const current = hsvaRef.current;
    const want = rgbaToHex(alpha ? parsed : { ...parsed, a: 1 }, alpha);
    if (want === detailsOf(current, alpha).hex) return;
    lastHex.current = want;
    const next = toHsva(value, alpha, current.h);
    hsvaRef.current = next;
    setHsvaState(next);
  }, [value, alpha]);

  const commit = (next: Hsva, complete: boolean) => {
    const resolved = alpha ? next : { ...next, a: 1 };
    setHsva(resolved);
    const details = detailsOf(resolved, alpha);
    if (details.hex !== lastHex.current) {
      lastHex.current = details.hex;
      onChange?.(details.hex, details);
    }
    if (complete) onChangeComplete?.(details.hex, details);
  };

  const complete = () => {
    const details = detailsOf(hsvaRef.current, alpha);
    onChangeComplete?.(details.hex, details);
  };

  const setFormat = (next: ColorFormat) => {
    setDraft(null);
    setFormatState(next);
    onFormatChange?.(next);
  };

  const applyText = (text: string): boolean => {
    const rgba = parseColor(text, format);
    if (!rgba) return false;
    const hsv = rgbToHsv(rgba);
    const current = hsvaRef.current;
    commit(
      {
        h: hsv.s === 0 || hsv.v === 0 ? current.h : hsv.h,
        s: hsv.s,
        v: hsv.v,
        a: alpha ? rgba.a : 1,
      },
      false,
    );
    return true;
  };

  const rgba = hsvaToRgba(hsva);
  const shown = formatColor(rgba, format, alpha);
  const text = draft ?? shown;
  const invalid = draft !== null && draft.trim() !== "" && parseColor(draft, format) === null;
  const currentHex = detailsOf(hsva, alpha).hex;

  const surface: SurfaceProps = { hsva, disabled, labels, commit, complete };

  const pickFromScreen = async () => {
    const Ctor = getEyeDropper();
    if (!Ctor) return;
    try {
      const { sRGBHex } = await new Ctor().open();
      const parsed = parseHex(sRGBHex);
      if (!parsed) return;
      const hsv = rgbToHsv(parsed);
      commit(
        {
          h: hsv.s === 0 || hsv.v === 0 ? hsvaRef.current.h : hsv.h,
          s: hsv.s,
          v: hsv.v,
          a: hsvaRef.current.a,
        },
        true,
      );
    } catch {
      // Dismissed with Escape: nothing to do.
    }
  };

  return (
    <div
      data-slot="color-picker"
      data-disabled={disabled ? "" : undefined}
      className={cn("flex w-[17rem] max-w-full flex-col gap-3", className)}
      {...props}
    >
      <SaturationArea {...surface} />

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "relative size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-border",
            CHECKER,
          )}
        >
          <span
            className="absolute inset-0 bg-[color:var(--cp-color)]"
            style={{ "--cp-color": currentHex } as CpVars}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <HueSlider {...surface} />
          {alpha ? <AlphaSlider {...surface} /> : null}
        </div>
        {canPick ? (
          <button
            type="button"
            aria-label={labels.eyeDropper}
            title={labels.eyeDropper}
            onClick={() => void pickFromScreen()}
            className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-colors duration-micro hover:bg-accent hover:text-foreground"
          >
            <Droplet className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          aria-label={labels.format}
          value={format}
          disabled={disabled ?? false}
          onValueChange={(next) => {
            if (typeof next === "string" && next) setFormat(next as ColorFormat);
          }}
          className="shrink-0 gap-0 rounded-[var(--radius-sm)] p-0.5"
        >
          {FORMATS.map((id) => (
            <ToggleGroupItem
              key={id}
              value={id}
              size="sm"
              className="h-6 rounded-[calc(var(--radius-sm)-2px)] px-1.5 text-xs leading-none"
            >
              {FORMAT_LABEL[id]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Input
          data-allow-native
          size="sm"
          aria-label={labels.input}
          aria-invalid={invalid || undefined}
          title={invalid ? labels.invalid : undefined}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          value={text}
          className="min-w-0 flex-1 font-mono text-xs"
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            applyText(next);
          }}
          onBlur={() => {
            if (draft !== null && !invalid) complete();
            setDraft(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              if (draft !== null && !invalid) complete();
              setDraft(null);
            } else if (event.key === "Escape" && draft !== null) {
              setDraft(null);
            }
          }}
        />
      </div>
      {format !== "oklch" ? (
        <p className="-mt-1.5 truncate font-mono text-xs text-muted-foreground" aria-hidden="true">
          {formatOklch(rgba, rgba.a, alpha)}
        </p>
      ) : null}

      {swatches?.length ? (
        <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
          <legend className="sr-only">{labels.swatches}</legend>
          {swatches.map((swatch) => {
            const parsed = parseHex(swatch);
            if (!parsed) return null;
            const hex = rgbaToHex(parsed, true);
            const active = hex === rgbaToHex(rgba, true) || hex === currentHex;
            return (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => {
                  const hsv = rgbToHsv(parsed);
                  commit(
                    {
                      h: hsv.s === 0 || hsv.v === 0 ? hsvaRef.current.h : hsv.h,
                      s: hsv.s,
                      v: hsv.v,
                      a: alpha ? parsed.a : 1,
                    },
                    true,
                  );
                }}
                className={cn(
                  "size-6 bg-[color:var(--cp-color)] rounded-full border-2 ring-1 ring-inset ring-border transition-[box-shadow] duration-micro ease-out hover:ring-foreground/40 disabled:opacity-50",
                  active ? "border-foreground" : "border-transparent",
                )}
                style={{ "--cp-color": swatch } as CpVars}
              />
            );
          })}
        </fieldset>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ColorPickerPopover                                                          */
/* -------------------------------------------------------------------------- */

export interface ColorPickerPopoverProps extends ColorPickerProps {
  /**
   * Custom trigger. A single element (usually a `<button>`); it receives the
   * popover's trigger behaviour. Omit for the default swatch button.
   */
  trigger?: React.ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Class for the default swatch trigger. */
  triggerClassName?: string;
  /** CSS `<image>` (a gradient) for the default trigger instead of the live colour, e.g. a hue wheel while unset. */
  triggerFill?: string | undefined;
  /** Draws the default trigger as the chosen swatch in a preset row. */
  triggerSelected?: boolean | undefined;
}

function ColorPickerPopover({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  side = "bottom",
  align = "start",
  triggerClassName,
  triggerFill,
  triggerSelected,
  value,
  defaultValue = FALLBACK,
  onChange,
  labels: labelOverrides,
  className,
  ...pickerProps
}: ColorPickerPopoverProps) {
  const labels = useUiLabels("colorPicker", labelOverrides);
  // The default trigger shows the live colour, so it tracks it even when uncontrolled.
  const [tracked, setTracked] = React.useState(value ?? defaultValue);
  const shown = value ?? tracked;

  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${labels.trigger}, ${shown}`}
            disabled={pickerProps.disabled}
            className={cn(
              "relative size-8 overflow-hidden rounded-full border-2 ring-1 ring-inset ring-border transition-[box-shadow] duration-micro ease-out hover:ring-foreground/40 disabled:opacity-50",
              triggerSelected ? "border-foreground" : "border-transparent",
              CHECKER,
              triggerClassName,
            )}
          >
            <span
              className={cn(
                "absolute inset-0",
                triggerFill ? "bg-[image:var(--cp-fill)]" : "bg-[color:var(--cp-color)]",
              )}
              style={{ "--cp-color": shown, "--cp-fill": triggerFill } as CpVars}
            />
          </button>
        </PopoverTrigger>
      )}
      <PopoverContent side={side} align={align} className={cn("w-auto p-3", className)}>
        <ColorPicker
          {...pickerProps}
          labels={labelOverrides}
          value={value}
          defaultValue={value === undefined ? tracked : defaultValue}
          onChange={(hex, details) => {
            setTracked(hex);
            onChange?.(hex, details);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { ColorPicker, ColorPickerPopover };
