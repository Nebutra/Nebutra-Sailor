"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatRelative, formatUtc } from "@/lib/format";
import type { AppLocale } from "@/lib/locale";

/**
 * A timestamp in the reader's zone with the UTC instant in its tooltip.
 *
 * The server already knows the zone (the `ns_tz` cookie), so server and
 * browser render the same text and nothing swaps after hydration. On a first
 * visit, before the cookie exists, it says UTC rather than guessing.
 * Relative times start from the request's clock and tick once a minute.
 */
export function LocalTime({
  iso,
  locale,
  timeZone,
  mode = "datetime",
  nowIso,
  className,
}: {
  iso: string;
  locale: AppLocale;
  timeZone: string | null;
  mode?: "datetime" | "relative";
  nowIso?: string;
  className?: string;
}) {
  const date = new Date(iso);
  const [now, setNow] = useState(() => (nowIso ? new Date(nowIso) : date));

  useEffect(() => {
    if (mode !== "relative") return;
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [mode]);

  const text =
    mode === "relative"
      ? formatRelative(date, now, locale)
      : timeZone
        ? formatDateTime(date, locale, timeZone)
        : `${formatDateTime(date, locale, "UTC")} UTC`;

  return (
    <time dateTime={iso} title={formatUtc(date)} className={className}>
      {text}
    </time>
  );
}
