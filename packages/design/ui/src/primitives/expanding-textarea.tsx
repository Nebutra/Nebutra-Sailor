"use client";

import * as React from "react";
import { cn } from "../utils/cn";

export type ExpandingTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const ExpandingTextarea = React.forwardRef<HTMLTextAreaElement, ExpandingTextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const handleInput = React.useCallback(
      (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
        if (onChange) {
          // Create a synthetic event that looks enough like a change event
          onChange(e as unknown as React.ChangeEvent<HTMLTextAreaElement>);
        }
      },
      [onChange],
    );

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden resize-none",
          className,
        )}
        onInput={handleInput}
        onChange={onChange}
        {...props}
      />
    );
  },
);

ExpandingTextarea.displayName = "ExpandingTextarea";
