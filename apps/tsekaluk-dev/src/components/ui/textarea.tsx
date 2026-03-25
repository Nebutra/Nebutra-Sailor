import clsx from "clsx";
import React, { useState } from "react";
import { ErrorDisplay } from "@/components/ui/error";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  sizeType?: "xSmall" | "small" | "mediumSmall" | "large";
  onValueChange?: (value: string) => void;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      defaultValue,
      placeholder,
      disabled,
      error,
      sizeType,
      style,
      value,
      onChange,
      onValueChange,
      className,
      ...props
    },
    ref,
  ) => {
    const [_value, set_value] = useState(value || defaultValue || "");

    const _onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      set_value(e.target.value);
      if (onChange) {
        onChange(e);
      }
      if (onValueChange) {
        onValueChange(e.target.value);
      }
    };

    return (
      <div className="w-full flex flex-col gap-2">
        <textarea
          className={clsx(
            "rounded-[var(--radius-md)] resize-none font-sans bg-background-100 text-geist-foreground placeholder:text-gray-900 outline-none w-full duration-150 border border-gray-alpha-400 hover:border-gray-alpha-500 hover:ring-0",
            sizeType === "large" ? "h-12 py-2.5 px-3 text-base" : "h-10 p-2.5 text-sm",
            disabled &&
              "bg-gray-100 text-gray-700 placeholder:text-gray-700 placeholder:opacity-50 cursor-not-allowed",
            error
              ? "ring-red-300 ring-4 border-red-900 text-error"
              : "focus:border-gray-alpha-600 focus:shadow-focus-input",
            className,
          )}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          style={style}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={value !== undefined ? value : _value}
          onChange={_onChange}
          ref={ref}
          {...props}
        />
        {error && (
          <ErrorDisplay size={sizeType === "large" ? "large" : "small"}>{error}</ErrorDisplay>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
