"use client";

/**
 * NumberField — numeric entry on Base UI NumberField.
 *
 * https://base-ui.com/react/components/number-field
 *
 * Replaces `<input type="number">` / `<Input type="number">`, whose OS spin
 * buttons cannot be themed, whose wheel-to-change silently edits a value the
 * user was only scrolling past, and which accept "e", "+" and "-" mid-string.
 * What this gives instead:
 *
 *   - themed − / + steppers (press-and-hold repeats), ↑ / ↓ step, Shift for
 *     `largeStep`, Alt/Option for `smallStep`, Home / End jump to min / max
 *   - wheel scrubbing OFF by default (`allowWheelScrub` to opt in)
 *   - locale-aware parsing and formatting (`locale`, `format`), with
 *     `inputmode` chosen for the soft keyboard
 *   - min / max clamping on commit, `step` snapping on demand
 *   - optional drag-to-scrub on the label (`scrub`), the Figma / Linear idiom
 *   - the same label / description / error contract as `Input`
 *
 * `value` accepts a number, `null`, or a numeric string, so a field whose
 * state was a string for `<Input type="number">` migrates without changing
 * that state's type:
 *
 *   <NumberField label="Width" id="w" value={width}
 *     onValueChange={(v) => setWidth(v == null ? "" : String(v))} />
 *
 * Formatting defaults to no grouping and full precision, because these fields
 * mostly hold ports, counts, and calculator operands, where "12,345" or a
 * value rounded to three decimals would be wrong. Pass `format` for currency,
 * percent or grouped display.
 */

import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { ChevronUp, Minus, Plus } from "@nebutra/icons";
import * as React from "react";
import { type InputSize, inputTokens } from "../tokens/components/input";
import { cn } from "../utils/cn";
import { formControlInvalidClassNames } from "./form-control";
import { Label } from "./label";

type BaseRootProps = React.ComponentProps<typeof BaseNumberField.Root>;

export interface NumberFieldProps
  extends Omit<
    BaseRootProps,
    "value" | "defaultValue" | "onValueChange" | "className" | "render" | "children" | "onBlur"
  > {
  /** Number, `null` (empty), or a numeric string. */
  value?: number | string | null;
  defaultValue?: number | string | null;
  /** Fires with the parsed number, or `null` when the field is cleared. */
  onValueChange?: (value: number | null) => void;
  /** Visible label. Pair with `id` so the label targets the input. */
  label?: React.ReactNode;
  /** Make the label a drag-to-scrub handle. */
  scrub?: boolean;
  /** Helper text, linked through aria-describedby. */
  description?: React.ReactNode;
  /** `true` marks invalid; a string also renders the message. */
  error?: string | boolean;
  /** Visual size, matching `Input`. */
  size?: InputSize;
  /** Hide the − / + steppers (arrow keys still step). */
  hideSteppers?: boolean;
  /** Unit or affix shown after the number, e.g. "px" or "%". */
  suffix?: React.ReactNode;
  placeholder?: string;
  /** Applied to the outer field wrapper. */
  className?: string;
  /** Applied to the bordered control group. */
  groupClassName?: string;
  /** Applied to the `<input>`. */
  inputClassName?: string;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  "aria-describedby"?: string;
  /** Set by `FormControl`; equivalent to `error={true}`. */
  "aria-invalid"?: boolean | "true" | "false";
  /** Accessible names for the steppers. Pass translated strings. */
  incrementLabel?: string;
  decrementLabel?: string;
  /** Fires when the input loses focus. */
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/** No grouping and full precision unless the caller asks for more. */
const DEFAULT_FORMAT: Intl.NumberFormatOptions = {
  useGrouping: false,
  maximumFractionDigits: 20,
};

function toNumber(value: number | string | null | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const stepperClassName = cn(
  "flex w-[var(--input-control-size)] shrink-0 items-center justify-center self-stretch",
  "text-muted-foreground transition-colors duration-micro ease-out",
  "hover:bg-accent hover:text-accent-foreground",
  "disabled:pointer-events-none disabled:opacity-40",
  "[&_svg]:size-[var(--input-control-icon-size)]",
);

export function NumberField({
  value,
  defaultValue,
  onValueChange,
  label,
  scrub = false,
  description,
  error,
  size = "md",
  hideSteppers = false,
  suffix,
  placeholder,
  className,
  groupClassName,
  inputClassName,
  id,
  format,
  incrementLabel = "Increase",
  decrementLabel = "Decrease",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  onBlur,
  disabled,
  ...rootProps
}: NumberFieldProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = typeof error === "string" ? `${inputId}-error` : undefined;
  const invalid =
    error === true || typeof error === "string" || ariaInvalid === true || ariaInvalid === "true";
  const describedBy =
    [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const token = inputTokens.sizes[size];

  const controlled = value !== undefined ? { value: toNumber(value) ?? null } : {};
  const initial = toNumber(defaultValue);
  const uncontrolled = initial != null ? { defaultValue: initial } : {};

  const labelNode =
    label == null ? null : scrub ? (
      <BaseNumberField.ScrubArea className="inline-flex cursor-ew-resize select-none">
        <Label htmlFor={inputId} className="cursor-ew-resize">
          {label}
        </Label>
        <BaseNumberField.ScrubAreaCursor className="drop-shadow-sm">
          <ChevronUp aria-hidden="true" className="size-4 rotate-90" />
        </BaseNumberField.ScrubAreaCursor>
      </BaseNumberField.ScrubArea>
    ) : (
      <Label htmlFor={inputId}>{label}</Label>
    );

  return (
    <BaseNumberField.Root
      id={inputId}
      format={format ?? DEFAULT_FORMAT}
      disabled={disabled}
      onValueChange={(next) => onValueChange?.(next)}
      className={cn("flex w-full flex-col gap-1.5", className)}
      {...controlled}
      {...uncontrolled}
      {...rootProps}
    >
      {labelNode}
      <BaseNumberField.Group
        data-invalid={invalid ? "" : undefined}
        className={cn(
          "flex h-[var(--input-height)] w-full items-stretch overflow-hidden rounded-[var(--input-radius)]",
          "border border-input bg-background text-foreground",
          "transition-[border-color,box-shadow] duration-micro ease-out",
          "focus-within:border-ring focus-within:ring-[length:var(--input-focus-ring-width)] focus-within:ring-ring/30",
          "data-[invalid]:border-destructive/60 data-[invalid]:focus-within:border-destructive data-[invalid]:focus-within:ring-destructive/20",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          groupClassName,
        )}
        style={
          {
            "--input-height": `${token.height}px`,
            "--input-padding-x": `${token.paddingX}px`,
            "--input-font-size": `${token.fontSize}px`,
            "--input-radius": `${token.radius}px`,
            "--input-control-size": `${token.height - 2}px`,
            "--input-control-icon-size": `${token.iconSize}px`,
            "--input-focus-ring-width": `${inputTokens.focusRingWidth}px`,
          } as React.CSSProperties
        }
      >
        <BaseNumberField.Input
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          placeholder={placeholder}
          onBlur={onBlur}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-[var(--input-padding-x)] text-[length:var(--input-font-size)] tabular-nums",
            "outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
            formControlInvalidClassNames.input,
            inputClassName,
          )}
        />
        {suffix != null ? (
          <span
            aria-hidden="true"
            className="flex items-center pr-[var(--input-padding-x)] text-[length:var(--input-font-size)] text-muted-foreground"
          >
            {suffix}
          </span>
        ) : null}
        {hideSteppers ? null : (
          <span className="flex shrink-0 border-l border-input">
            <BaseNumberField.Decrement
              aria-label={decrementLabel}
              className={cn(stepperClassName, "border-r border-input")}
            >
              <Minus aria-hidden="true" />
            </BaseNumberField.Decrement>
            <BaseNumberField.Increment aria-label={incrementLabel} className={stepperClassName}>
              <Plus aria-hidden="true" />
            </BaseNumberField.Increment>
          </span>
        )}
      </BaseNumberField.Group>
      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {typeof error === "string" ? (
        <p id={errorId} className="text-xs font-medium text-destructive-strong">
          {error}
        </p>
      ) : null}
    </BaseNumberField.Root>
  );
}
