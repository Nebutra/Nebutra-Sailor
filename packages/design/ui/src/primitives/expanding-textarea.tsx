"use client";

"use client";

import * as React from "react";
import { Textarea, type TextareaProps } from "./textarea";

export type ExpandingTextareaProps = TextareaProps;

export const ExpandingTextarea = React.forwardRef<HTMLTextAreaElement, ExpandingTextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setTextareaRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;

        if (typeof ref === "function") {
          ref(node);
          return;
        }

        if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const resize = React.useCallback(() => {
      const target = textareaRef.current;
      if (!target) return;

      target.style.height = "auto";
      target.style.height = `${target.scrollHeight}px`;
    }, []);

    React.useLayoutEffect(() => {
      resize();
    }, [resize]);

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const target = event.currentTarget;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
        onChange?.(event);
      },
      [onChange],
    );

    return (
      <Textarea ref={setTextareaRef} className={className} onChange={handleChange} {...props} />
    );
  },
);

ExpandingTextarea.displayName = "ExpandingTextarea";
