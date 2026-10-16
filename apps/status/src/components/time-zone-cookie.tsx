"use client";

import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone";

/** Tell the server the reader's zone once, so later pages render local times directly. */
export function TimeZoneCookie({ current }: { current: string | null }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone !== current) {
      // biome-ignore lint/suspicious/noDocumentCookie: a single preference cookie, no Cookie Store API in Safari
      document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  }, [current]);
  return null;
}
