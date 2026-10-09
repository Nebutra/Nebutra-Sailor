"use client";

"use client";

import * as React from "react";
import { Textarea, type TextareaProps } from "./textarea";

export type ExpandingTextareaProps = TextareaProps;

const supportsFieldSizing = () =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("field-sizing", "content");

export const ExpandingTextarea = ({
  className,
  onChange,
  ref,
  ...props
}: ExpandingTextareaProps & { ref?: React.Ref<HTMLTextAreaElement> | undefined }) => {
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

  // Textarea already grows natively via `field-sizing: content`; measure in JS only where unsupported.
  const resize = React.useCallback(() => {
    const target = textareaRef.current;
    if (!target || supportsFieldSizing()) return;

    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  }, []);

  React.useLayoutEffect(() => {
    resize();
  }, [resize]);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!supportsFieldSizing()) {
        const target = event.currentTarget;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
      }
      onChange?.(event);
    },
    [onChange],
  );

  return <Textarea ref={setTextareaRef} className={className} onChange={handleChange} {...props} />;
};

ExpandingTextarea.displayName = "ExpandingTextarea";
