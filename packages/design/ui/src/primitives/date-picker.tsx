"use client";

import { Calendar as CalendarIcon } from "@nebutra/icons";
import { format, isValid, parse } from "date-fns";
import * as React from "react";
import type { DayPickerProps } from "react-day-picker";
import { type InputSize, inputTokens } from "../tokens/components/input";
import { cn } from "../utils/cn";
import { Calendar } from "./calendar";
import { inputControlButtonVariants, inputVariants } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * The wire format is the one `<input type="date">` already exposed on `.value`,
 * so a field can swap to this component without touching whatever reads it.
 * What the user sees is `displayFormat`; what callers receive is always this.
 */
const ISO_DATE_FORMAT = "yyyy-MM-dd";

/** Parse an ISO `yyyy-MM-dd` string. Returns undefined for empty or unparseable input. */
export function parseIsoDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, ISO_DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed : undefined;
}

/** Format a date as the ISO `yyyy-MM-dd` wire value. */
export function toIsoDate(date: Date): string {
  return format(date, ISO_DATE_FORMAT);
}

type DatePickerCssVars = React.CSSProperties & Record<string, string | number | undefined>;

/**
 * Mirrors Input's own CSS-variable wiring from the same token source, so the
 * field and its calendar button stay locked to the Input geometry without
 * Input needing a new interactive slot.
 */
function getFieldStyle(size: InputSize, style: React.CSSProperties | undefined): DatePickerCssVars {
  const token = inputTokens.sizes[size];

  return {
    "--input-height": `${token.height}px`,
    "--input-padding-x": `${token.paddingX}px`,
    "--input-padding-left": `${token.affixWidth}px`,
    "--input-padding-right": `${token.affixWidth}px`,
    "--input-font-size": `${token.fontSize}px`,
    "--input-radius": `${token.radius}px`,
    "--input-affix-inset": `${token.affixInset}px`,
    "--input-control-inset": `${token.controlInset}px`,
    "--input-control-size": `${token.controlSize}px`,
    "--input-control-icon-size": `${token.controlIconSize}px`,
    "--input-icon-size": `${token.iconSize}px`,
    "--input-focus-ring-width": `${inputTokens.focusRingWidth}px`,
    borderRadius: "var(--input-radius)",
    outline: "none",
    ...style,
  };
}

type CalendarPassthrough = Pick<
  DayPickerProps,
  "locale" | "weekStartsOn" | "numberOfMonths" | "fixedWeeks" | "showOutsideDays" | "dir"
>;

/**
 * Everything else lands on the text field, so a call site keeps the `data-*`
 * hooks, `aria-*` overrides and focus handlers it had on the native input.
 */
type FieldPassthrough = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | "value"
  | "defaultValue"
  | "onChange"
  | "onBlur"
  | "size"
  | "type"
  | "min"
  | "max"
  | "dir"
  | "className"
  | "children"
  | "prefix"
>;

export interface DatePickerProps extends CalendarPassthrough, FieldPassthrough {
  /** Selected date as `yyyy-MM-dd`. Controlled. */
  value?: string;
  /** Initial date as `yyyy-MM-dd` when uncontrolled. */
  defaultValue?: string;
  /** Fires with `yyyy-MM-dd`, or `""` when the field is cleared. */
  onValueChange?: (value: string) => void;
  /** Visible label. Requires `id` so the label stays associated. */
  label?: string;
  /** Id of the text field. Required for `label` to stay associated. */
  id?: string;
  /** Submitted with the surrounding form. */
  name?: string;
  /** Text shown while the field is empty. Defaults to `displayFormat`, so the expected shape is visible. */
  placeholder?: string;
  /** Helper text linked through aria-describedby. */
  description?: string;
  /** Boolean marks invalid; a string also renders the message. */
  error?: string | boolean;
  /**
   * Field height and type size, matching `Input`.
   * @default "md"
   */
  size?: InputSize;
  /** Disables the text field and the calendar button. */
  disabled?: boolean;
  /** Marks the text field required for native form validation. */
  required?: boolean;
  /**
   * Earliest selectable date as `yyyy-MM-dd`. Earlier days are disabled in the calendar, and a
   * typed date before it is not committed: the field is marked `aria-invalid` until it is fixed
   * or blurred, and blur restores the last committed value.
   */
  min?: string;
  /**
   * Latest selectable date as `yyyy-MM-dd`. Later days are disabled in the calendar, and a typed
   * date after it is not committed, with the same invalid marking and blur behaviour as `min`.
   */
  max?: string;
  /**
   * How the value is rendered and parsed in the field, as a date-fns format string.
   * Callers still receive `yyyy-MM-dd`.
   * @default "yyyy-MM-dd"
   */
  displayFormat?: string;
  /** Accessible name for the calendar button. */
  triggerLabel?: string;
  /** Applied to the text field. */
  className?: string;
  /** Applied to the label, field and message wrapper. Only used when a label, description or error message is shown. */
  fieldClassName?: string;
  /** Applied to the box that holds the text field and the calendar button. */
  wrapperClassName?: string;
}

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

/**
 * Date field with a themed calendar popover.
 *
 * Replaces `<input type="date">`, whose picker is drawn by the OS and therefore
 * ignores the theme entirely — the same reason raw `<select>` is banned in the
 * product apps. Typing is preserved, because a native date field's one real
 * advantage is entering a far-off date without paging through months.
 */
function DatePicker({
  value,
  defaultValue,
  onValueChange,
  label,
  id,
  name,
  placeholder,
  description,
  error,
  size = "md",
  disabled,
  required,
  min,
  max,
  displayFormat = ISO_DATE_FORMAT,
  triggerLabel = "Open calendar",
  className,
  fieldClassName,
  wrapperClassName,
  locale,
  weekStartsOn,
  numberOfMonths,
  fixedWeeks,
  showOutsideDays,
  dir,
  ...fieldProps
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = isControlled ? value : internalValue;

  const selected = parseIsoDate(currentValue);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  // Typing is free-form until it parses, so the field keeps a draft of its own.
  // Committing on every keystroke would rewrite "2026-0" into a real date.
  const [draft, setDraft] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const displayValue = draft ?? (selected ? format(selected, displayFormat) : (currentValue ?? ""));

  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = typeof error === "string" ? `${fieldId}-error` : undefined;
  const invalid = error === true || typeof error === "string";

  // ISO strings sort the same as the dates they name, so range checks stay on whole days.
  const isOutOfRange = (date: Date) => {
    const iso = toIsoDate(date);
    return Boolean((minDate && iso < toIsoDate(minDate)) || (maxDate && iso > toIsoDate(maxDate)));
  };
  const draftDate = draft ? parse(draft, displayFormat, new Date()) : undefined;
  const draftOutOfRange = Boolean(draftDate && isValid(draftDate) && isOutOfRange(draftDate));

  const commit = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setDraft(text);

    if (text === "") {
      commit("");
      return;
    }

    const parsed = parse(text, displayFormat, new Date());
    if (isValid(parsed) && !isOutOfRange(parsed)) commit(toIsoDate(parsed));
  };

  // Drop the draft on blur so an unparseable string cannot outlive the field's
  // real value and read back as if it had been accepted.
  const handleBlur = () => setDraft(null);

  const handleSelect = (next: Date | undefined) => {
    setDraft(null);
    commit(next ? toIsoDate(next) : "");
    setOpen(false);
  };

  const disabledMatcher = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  const control = (
    <div
      data-slot="date-picker"
      className={cn("relative flex items-center", wrapperClassName)}
      style={getFieldStyle(size, undefined)}
    >
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        data-slot="date-picker-input"
        aria-invalid={invalid || draftOutOfRange || undefined}
        aria-describedby={joinIds(descriptionId, errorId)}
        {...fieldProps}
        {...(dir !== undefined ? { dir } : {})}
        id={fieldId}
        name={name}
        className={cn(inputVariants({ size, affix: "suffix", tone: "bordered" }), className)}
        style={getFieldStyle(size, undefined)}
        placeholder={placeholder ?? displayFormat}
        value={displayValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={triggerLabel}
            disabled={disabled}
            className={inputControlButtonVariants()}
            style={getFieldStyle(size, undefined)}
          >
            <CalendarIcon aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            {...(selected ? { selected, defaultMonth: selected } : {})}
            onSelect={handleSelect}
            {...(disabledMatcher.length > 0 ? { disabled: disabledMatcher } : {})}
            {...(minDate ? { startMonth: minDate } : {})}
            {...(maxDate ? { endMonth: maxDate } : {})}
            {...(locale ? { locale } : {})}
            {...(weekStartsOn !== undefined ? { weekStartsOn } : {})}
            {...(numberOfMonths !== undefined ? { numberOfMonths } : {})}
            {...(fixedWeeks !== undefined ? { fixedWeeks } : {})}
            {...(showOutsideDays !== undefined ? { showOutsideDays } : {})}
            {...(dir !== undefined ? { dir } : {})}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  if (!label && !description && typeof error !== "string") {
    return control;
  }

  return (
    <div
      data-slot="date-picker-field"
      className={cn("grid gap-[var(--input-field-gap)]", fieldClassName)}
      style={{ "--input-field-gap": `${inputTokens.fieldGap}px` } as React.CSSProperties}
    >
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {control}

      {description && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}

      {typeof error === "string" && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive-strong">
          {error}
        </p>
      )}
    </div>
  );
}
DatePicker.displayName = "DatePicker";

export { DatePicker, ISO_DATE_FORMAT };
