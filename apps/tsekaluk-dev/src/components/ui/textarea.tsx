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
          data-allow-native
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
