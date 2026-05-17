"use client";

import * as React from "react";
import { type TextareaSize, textareaTokens } from "../tokens/components/textarea";
import { cn } from "../utils/cn";

type NativeTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">;

type LabelledTextareaProps = {
  /** Visible label. Type-level nudge keeps labelled fields explicitly addressable. */
  label: string;
  id: string;
};

type UnlabelledTextareaProps = {
  label?: undefined;
  id?: string;
};

type TextareaOwnProps = {
  /** Visual size variant. Uses the same compact form scale as Input. */
  size?: TextareaSize;
  /** Helper text associated through aria-describedby. Replaced by string errors. */
  description?: string;
  /** Boolean marks invalid state; string also renders an inline field error. */
  error?: string | boolean;
  /** Value-first change callback for consumers that do not need the native event. */
  onValueChange?: (value: string) => void;
  /** Applied to the label/helper/error field wrapper. */
  fieldClassName?: string;
};

export type TextareaProps = NativeTextareaProps &
  TextareaOwnProps &
  (LabelledTextareaProps | UnlabelledTextareaProps);

type TextareaCssVars = React.CSSProperties & {
  "--textarea-min-height"?: string;
  "--textarea-padding-x"?: string;
  "--textarea-padding-y"?: string;
  "--textarea-font-size"?: string;
  "--textarea-radius"?: string;
  "--textarea-focus-ring-width"?: string;
};

type TextareaFieldCssVars = React.CSSProperties & {
  "--textarea-field-gap"?: string;
  "--textarea-label-size"?: string;
};

const fieldMessageClassName = "text-xs text-muted-foreground";
const fieldErrorClassName = "text-xs font-medium text-destructive";

function getTextareaStyle(
  size: TextareaSize,
  style: React.CSSProperties | undefined,
): TextareaCssVars {
  const token = textareaTokens.sizes[size];

  return {
    "--textarea-min-height": `${token.minHeight}px`,
    "--textarea-padding-x": `${token.paddingX}px`,
    "--textarea-padding-y": `${token.paddingY}px`,
    "--textarea-font-size": `${token.fontSize}px`,
    "--textarea-radius": `${token.radius}px`,
    "--textarea-focus-ring-width": `${textareaTokens.focusRingWidth}px`,
    borderRadius: "var(--textarea-radius)",
    outline: "none",
    ...style,
  };
}

function getTextareaFieldStyle(): TextareaFieldCssVars {
  return {
    "--textarea-field-gap": `${textareaTokens.fieldGap}px`,
    "--textarea-label-size": `${textareaTokens.labelSize}px`,
  };
}

function joinDescriptionIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

function isInvalid(
  error: string | boolean | undefined,
  ariaInvalid: NativeTextareaProps["aria-invalid"],
) {
  return (
    error === true || typeof error === "string" || ariaInvalid === true || ariaInvalid === "true"
  );
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      style,
      size = "md",
      label,
      description,
      error,
      fieldClassName,
      id,
      onChange,
      onValueChange,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const baseId = React.useId();
    const textareaId =
      id ?? (label || description || typeof error === "string" ? baseId : undefined);
    const resolvedInvalid = isInvalid(error, ariaInvalid);
    const descriptionId = description && textareaId ? `${textareaId}-description` : undefined;
    const errorId = typeof error === "string" && textareaId ? `${textareaId}-error` : undefined;
    const describedBy = joinDescriptionIds(ariaDescribedBy, descriptionId, errorId);

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onValueChange?.(event.currentTarget.value);
        onChange?.(event);
      },
      [onChange, onValueChange],
    );

    const control = (
      <textarea
        className={cn(
          "flex min-h-[var(--textarea-min-height)] w-full resize-y rounded-[var(--textarea-radius)] border border-input bg-background",
          "px-[var(--textarea-padding-x)] py-[var(--textarea-padding-y)] text-[length:var(--textarea-font-size)] text-foreground shadow-[var(--shadow-xs)]",
          "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out placeholder:text-muted-foreground",
          "outline-none focus:border-ring focus:ring-[length:var(--textarea-focus-ring-width)] focus:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-default read-only:bg-muted/70",
          "aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/20",
          className,
        )}
        ref={ref}
        id={textareaId}
        aria-invalid={resolvedInvalid || undefined}
        aria-describedby={describedBy}
        style={getTextareaStyle(size, style)}
        onChange={handleChange}
        {...props}
      />
    );

    if (!label && !description && typeof error !== "string" && !fieldClassName) {
      return control;
    }

    return (
      <div
        data-slot="textarea-field"
        className={cn("grid gap-[var(--textarea-field-gap)]", fieldClassName)}
        style={getTextareaFieldStyle()}
      >
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[length:var(--textarea-label-size)] font-medium text-foreground"
          >
            {label}
          </label>
        )}

        {control}

        {description && !error && (
          <p id={descriptionId} className={fieldMessageClassName}>
            {description}
          </p>
        )}

        {typeof error === "string" && (
          <p id={errorId} role="alert" className={fieldErrorClassName}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
