"use client";

import * as React from "react";
import { Textarea } from "./textarea";

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
      <Textarea
        ref={textareaRef}
        className={className}
        onInput={handleInput}
        onChange={onChange}
        {...props}
      />
    );
  },
);

ExpandingTextarea.displayName = "ExpandingTextarea";
