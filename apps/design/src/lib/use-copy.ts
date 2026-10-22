"use client";

import { useCopyToClipboard } from "@nebutra/ui/primitives";
import * as React from "react";

/**
 * Which-one-was-copied marker on top of the library's single clipboard
 * implementation, so a row of copy targets can each say Copied and a live
 * region can announce it. A refused write leaves the marker unset.
 */
export function useCopy(resetMs = 1600) {
  const [copied, setCopied] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { copy: write } = useCopyToClipboard({ showToast: false, timeout: resetMs });

  const copy = React.useCallback(
    async (text: string, key: string) => {
      const ok = await write(text);
      if (timer.current) clearTimeout(timer.current);
      if (!ok) {
        setCopied(null);
        return;
      }
      setCopied(key);
      timer.current = setTimeout(() => setCopied(null), resetMs);
    },
    [write, resetMs],
  );

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { copied, copy };
}
