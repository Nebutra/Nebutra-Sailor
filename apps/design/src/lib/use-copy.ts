"use client";

import * as React from "react";

/**
 * Clipboard write with a short-lived "which one was copied" marker, so a button
 * can say Copied for a moment and a live region can announce it. Clipboard
 * failures (insecure origin, denied permission) leave the marker unset rather
 * than claiming a copy that did not happen.
 */
export function useCopy(resetMs = 1600) {
  const [copied, setCopied] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = React.useCallback(
    async (text: string, key: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(key);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(null), resetMs);
      } catch {
        setCopied(null);
      }
    },
    [resetMs],
  );

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { copied, copy };
}
