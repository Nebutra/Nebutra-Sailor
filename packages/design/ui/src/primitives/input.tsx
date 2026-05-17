"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import { Eye, EyeOff, LoaderCircle as Loader2, Cross as X } from "@nebutra/icons";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type InputSize, inputTokens } from "../tokens/components/input";
import { cn } from "../utils/cn";
import { Kbd } from "./kbd";

type InputCssVars = React.CSSProperties & {
  "--input-height"?: string;
  "--input-padding-x"?: string;
  "--input-padding-left"?: string;
  "--input-padding-right"?: string;
  "--input-font-size"?: string;
  "--input-radius"?: string;
  "--input-affix-inset"?: string;
  "--input-control-inset"?: string;
  "--input-control-size"?: string;
  "--input-control-icon-size"?: string;
  "--input-icon-size"?: string;
  "--input-focus-ring-width"?: string;
};

const inputVariants = cva(
  [
    "flex h-[var(--input-height)] w-full rounded-[var(--input-radius)] border border-input bg-background",
    "px-[var(--input-padding-x)] text-[length:var(--input-font-size)] text-foreground shadow-[var(--shadow-xs)]",
    "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out",
    "placeholder:text-muted-foreground",
    "outline-none focus:border-ring focus:ring-[length:var(--input-focus-ring-width)] focus:ring-ring/30",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "read-only:bg-muted/70 read-only:cursor-default",
    "file:h-full file:border-0 file:border-e file:border-solid file:border-input file:bg-transparent",
    "file:me-[var(--input-padding-x)] file:pe-[var(--input-padding-x)] file:text-[length:var(--input-font-size)] file:font-medium file:text-foreground",
    "aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/20",
    "[&[type=search]::-webkit-search-cancel-button]:appearance-none",
    "[&[type=search]::-webkit-search-decoration]:appearance-none",
    "[&[type=search]::-webkit-search-results-button]:appearance-none",
    "[&[type=search]::-webkit-search-results-decoration]:appearance-none",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "",
        md: "",
        lg: "",
      },
      affix: {
        none: "",
        prefix: "pl-[var(--input-padding-left)]",
        suffix: "pr-[var(--input-padding-right)]",
        both: "pl-[var(--input-padding-left)] pr-[var(--input-padding-right)]",
      },
    },
    defaultVariants: {
      size: "md",
      affix: "none",
    },
  },
);

const affixVariants = cva(
  [
    "pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center text-muted-foreground",
    "[&_svg:not([class*=size-])]:size-[var(--input-icon-size)]",
  ].join(" "),
  {
    variants: {
      side: {
        prefix: "left-[var(--input-affix-inset)]",
        suffix: "right-[var(--input-affix-inset)]",
      },
    },
  },
);

const inputControlButtonVariants = cva(
  [
    "absolute right-[var(--input-control-inset)] top-1/2 flex size-[var(--input-control-size)] -translate-y-1/2 items-center justify-center",
    "rounded-[var(--radius-sm)] text-muted-foreground transition-colors duration-micro ease-out",
    "hover:bg-accent hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-[var(--input-control-icon-size)]",
  ].join(" "),
);

const fieldMessageVariants = cva("text-xs", {
  variants: {
    tone: {
      description: "text-muted-foreground",
      error: "font-medium text-destructive",
    },
  },
});

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "size">;

type LabelledInputProps = {
  /** Visible label. Requires `id` so the label and input remain associated. */
  label: string;
  id: string;
};

type UnlabelledInputProps = {
  label?: undefined;
  id?: string;
};

type InputOwnProps = {
  /** Visual size variant. Uses Nebutra's compact form row scale. */
  size?: InputSize;
  /** Non-interactive adornment rendered inside the left edge. */
  prefix?: React.ReactNode;
  /** Non-interactive adornment rendered inside the right edge. Hidden by clear/shortcut controls. */
  suffix?: React.ReactNode;
  /** Show a clear button when the field has a value. */
  clearable?: boolean;
  /** Called after the clear button or Escape clears the field. */
  onClear?: () => void;
  /** Value-first change callback for consumers that do not need the native event. */
  onValueChange?: (value: string) => void;
  /** Visual shortcut hint, e.g. "⌘K". Dirty search fields show Esc instead. */
  shortcut?: string;
  /** Show an async spinner on the right side without disabling the field. */
  loading?: boolean;
  /** Adds a tokenized password visibility control when `type="password"`. */
  revealable?: boolean;
  /** Accessible label for the password visibility control when the value is hidden. */
  revealLabel?: string;
  /** Accessible label for the password visibility control when the value is visible. */
  hideLabel?: string;
  /** Clear the current value when Escape is pressed. Defaults to true for search inputs. */
  clearOnEscape?: boolean;
  /** Helper text associated with the input through aria-describedby. */
  description?: string;
  /** Boolean marks invalid state; string also renders an inline error message. */
  error?: string | boolean;
  /** Applied to the control wrapper when affixes or control buttons are rendered. */
  wrapperClassName?: string;
  /** Applied to the label/helper/error field wrapper. */
  fieldClassName?: string;
};

export type InputProps = NativeInputProps &
  InputOwnProps &
  (LabelledInputProps | UnlabelledInputProps) &
  VariantProps<typeof inputVariants>;

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function getInputStyle(size: InputSize, style: React.CSSProperties | undefined): InputCssVars {
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

function getAffixMode(prefix: React.ReactNode, hasRightAdornment: boolean) {
  if (prefix != null && hasRightAdornment) return "both";
  if (prefix != null) return "prefix";
  if (hasRightAdornment) return "suffix";
  return "none";
}

function isInvalid(
  error: string | boolean | undefined,
  ariaInvalid: NativeInputProps["aria-invalid"],
) {
  return (
    error === true || typeof error === "string" || ariaInvalid === true || ariaInvalid === "true"
  );
}

function isTextAffix(value: React.ReactNode): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function joinDescriptionIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, forwardedRef) => {
  const {
    className,
    type = "text",
    size = "md",
    prefix,
    suffix,
    clearable,
    onClear,
    onValueChange,
    shortcut,
    loading,
    revealable,
    revealLabel = "Show password",
    hideLabel = "Hide password",
    clearOnEscape,
    wrapperClassName,
    fieldClassName,
    label,
    description,
    error,
    value,
    defaultValue,
    onChange,
    onKeyDown,
    disabled,
    style,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    id,
    ...rest
  } = props;

  const isControlled = value !== undefined;
  const baseId = React.useId();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const descriptionId = description && id ? `${id}-description` : undefined;
  const errorId = typeof error === "string" && id ? `${id}-error` : undefined;
  const prefixDescriptionId = isTextAffix(prefix) ? `${id ?? baseId}-prefix` : undefined;
  const suffixDescriptionId = isTextAffix(suffix) ? `${id ?? baseId}-suffix` : undefined;
  const [internalValue, setInternalValue] = React.useState(
    typeof defaultValue === "string" || typeof defaultValue === "number"
      ? String(defaultValue)
      : "",
  );
  const [passwordVisible, setPasswordVisible] = React.useState(false);

  const currentValue = isControlled ? String(value ?? "") : internalValue;
  const clearOnEscapeEnabled = clearOnEscape ?? type === "search";
  const canRevealPassword = Boolean(revealable && type === "password");
  const showClear = Boolean(clearable && !disabled && currentValue.length > 0 && !loading);
  const showShortcut = Boolean(shortcut && !loading && !showClear);
  const showSpinner = Boolean(loading);
  const showPasswordToggle = Boolean(canRevealPassword && !loading && !showClear && !showShortcut);
  const hasRightAdornment =
    showClear || showShortcut || showSpinner || showPasswordToggle || suffix != null;
  const hasControlWrapper = prefix != null || hasRightAdornment;
  const affix = getAffixMode(prefix, hasRightAdornment);
  const resolvedInvalid = isInvalid(error, ariaInvalid);
  const describedBy = joinDescriptionIds(
    ariaDescribedBy,
    prefixDescriptionId,
    suffixDescriptionId,
    descriptionId,
    errorId,
  );
  const valueProps: Pick<
    React.InputHTMLAttributes<HTMLInputElement>,
    "defaultValue" | "value"
  > = isControlled
    ? { value }
    : clearable || shortcut || clearOnEscapeEnabled
      ? { value: currentValue }
      : { defaultValue };

  const setInputRef = React.useCallback(
    (node: HTMLElement | null) => {
      const input = node instanceof HTMLInputElement ? node : null;
      inputRef.current = input;
      assignRef(forwardedRef, input);
    },
    [forwardedRef],
  );

  const emitNativeInput = React.useCallback(
    (nextValue: string) => {
      const input = inputRef.current;

      if (!input) {
        if (!isControlled) setInternalValue(nextValue);
        onValueChange?.(nextValue);
        return;
      }

      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;

      valueSetter?.call(input, nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [isControlled, onValueChange],
  );

  const syncInputValue = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(event.currentTarget.value);
      onValueChange?.(event.currentTarget.value);
      onChange?.(event);
    },
    [isControlled, onChange, onValueChange],
  );

  const handleClear = React.useCallback(() => {
    emitNativeInput("");
    onClear?.();
    inputRef.current?.focus();
  }, [emitNativeInput, onClear]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);

      if (
        event.defaultPrevented ||
        event.key !== "Escape" ||
        !clearOnEscapeEnabled ||
        currentValue.length === 0 ||
        disabled
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleClear();
    },
    [clearOnEscapeEnabled, currentValue.length, disabled, handleClear, onKeyDown],
  );

  const control = (
    <BaseInput
      ref={setInputRef}
      data-slot="input"
      type={canRevealPassword && passwordVisible ? "text" : type}
      id={id}
      disabled={disabled}
      aria-invalid={resolvedInvalid || undefined}
      aria-describedby={describedBy}
      aria-busy={loading || undefined}
      className={cn(
        inputVariants({ size, affix }),
        type === "file" && "p-0 pr-[var(--input-padding-x)] text-muted-foreground",
        className,
      )}
      style={getInputStyle(size, style)}
      onChange={syncInputValue}
      onKeyDown={handleKeyDown}
      {...rest}
      {...valueProps}
    />
  );

  const inputControl = hasControlWrapper ? (
    <div
      data-slot="input-wrapper"
      className={cn("relative flex items-center", wrapperClassName)}
      style={getInputStyle(size, undefined)}
    >
      {prefix != null && (
        <span
          id={prefixDescriptionId}
          aria-hidden={!isTextAffix(prefix)}
          className={affixVariants({ side: "prefix" })}
        >
          {prefix}
        </span>
      )}

      {control}

      {showSpinner && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[var(--input-control-inset)] top-1/2 flex size-[var(--input-control-size)] -translate-y-1/2 items-center justify-center text-muted-foreground"
          style={getInputStyle(size, undefined)}
        >
          <Loader2 className="size-[var(--input-control-icon-size)] animate-spin" />
        </span>
      )}

      {showClear && (
        <button
          type="button"
          aria-label="Clear input"
          disabled={disabled}
          className={inputControlButtonVariants()}
          style={getInputStyle(size, undefined)}
          onClick={handleClear}
        >
          <X aria-hidden="true" />
        </button>
      )}

      {showShortcut && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[var(--input-control-inset)] top-1/2 flex -translate-y-1/2 items-center"
          style={getInputStyle(size, undefined)}
        >
          <Kbd small>{currentValue.length > 0 ? "Esc" : shortcut}</Kbd>
        </span>
      )}

      {showPasswordToggle && (
        <button
          type="button"
          aria-label={passwordVisible ? hideLabel : revealLabel}
          aria-pressed={passwordVisible}
          disabled={disabled}
          className={inputControlButtonVariants()}
          style={getInputStyle(size, undefined)}
          onClick={() => {
            setPasswordVisible((visible) => !visible);
            inputRef.current?.focus();
          }}
        >
          {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      )}

      {suffix != null && !showClear && !showShortcut && !showSpinner && !showPasswordToggle && (
        <span
          id={suffixDescriptionId}
          aria-hidden={!isTextAffix(suffix)}
          className={affixVariants({ side: "suffix" })}
        >
          {suffix}
        </span>
      )}
    </div>
  ) : (
    control
  );

  if (!label && !description && typeof error !== "string") {
    return inputControl;
  }

  return (
    <div
      data-slot="input-field"
      className={cn("grid gap-[var(--input-field-gap)]", fieldClassName)}
      style={
        {
          "--input-field-gap": `${inputTokens.fieldGap}px`,
        } as React.CSSProperties
      }
    >
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {inputControl}

      {description && !error && (
        <p id={descriptionId} className={fieldMessageVariants({ tone: "description" })}>
          {description}
        </p>
      )}

      {typeof error === "string" && (
        <p id={errorId} role="alert" className={fieldMessageVariants({ tone: "error" })}>
          {error}
        </p>
      )}
    </div>
  );
});
Input.displayName = "Input";

export { Input, inputControlButtonVariants, inputVariants };
