"use client";

import type React from "react";
import { slant, useAsciiText } from "react-ascii-text";

interface AsciiTextProps {
  text: string;
  className?: string;
  // biome-ignore lint/suspicious/noExplicitAny: the font object comes from the
  // caller's ASCII renderer and this package does not depend on that library
  font?: any;
}

export function AsciiText({ text, className = "", font = slant }: AsciiTextProps) {
  const asciiTextRef = useAsciiText({
    font: font,
    text: text,
  });

  return (
    <pre
      ref={asciiTextRef as React.RefObject<HTMLPreElement | null>}
      className={`font-mono leading-none m-0 p-0 ${className}`}
    />
  );
}
