"use client";

import * as React from "react";
import { textareaTokens } from "../tokens/components/textarea";
import { cn } from "../utils/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

type TextareaCssVars = React.CSSProperties & {
  "--textarea-min-height"?: string;
  "--textarea-padding-x"?: string;
  "--textarea-padding-y"?: string;
  "--textarea-font-size"?: string;
  "--textarea-radius"?: string;
  "--textarea-focus-ring-width"?: string;
};

function getTextareaStyle(style: React.CSSProperties | undefined): TextareaCssVars {
  return {
    "--textarea-min-height": `${textareaTokens.minHeight}px`,
    "--textarea-padding-x": `${textareaTokens.paddingX}px`,
    "--textarea-padding-y": `${textareaTokens.paddingY}px`,
    "--textarea-font-size": `${textareaTokens.fontSize}px`,
    "--textarea-radius": `${textareaTokens.radius}px`,
    "--textarea-focus-ring-width": `${textareaTokens.focusRingWidth}px`,
    ...style,
  };
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[var(--textarea-min-height)] w-full resize-y rounded-[var(--textarea-radius)] border border-input bg-background",
          "px-[var(--textarea-padding-x)] py-[var(--textarea-padding-y)] text-[length:var(--textarea-font-size)] text-foreground shadow-[var(--shadow-xs)]",
          "transition-[background-color,border-color,box-shadow,color] duration-micro ease-out placeholder:text-muted-foreground",
          "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[length:var(--textarea-focus-ring-width)] focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-default read-only:bg-muted/70",
          "aria-invalid:border-destructive/60 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20",
          className,
        )}
        ref={ref}
        style={getTextareaStyle(style)}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
