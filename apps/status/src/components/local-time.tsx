"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatRelative, formatUtc } from "@/lib/format";
import type { AppLocale } from "@/lib/locale";

/**
 * A timestamp in the reader's own time zone, with the UTC instant in the
 * tooltip. The server cannot know the zone, so it renders UTC and the browser
 * replaces it after hydration; relative times keep ticking.
 */
export function LocalTime({
  iso,
  locale,
  mode = "datetime",
  className,
  serverNow,
}: {
  iso: string;
  /** The render's clock, so relative text is right before hydration too. */
  serverNow?: string;
  locale: AppLocale;
  mode?: "datetime" | "relative";
  className?: string;
}) {
  const date = new Date(iso);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    if (mode !== "relative") return;
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [mode]);

  const text =
    mode === "relative"
      ? formatRelative(date, now ?? (serverNow ? new Date(serverNow) : date), locale)
      : now
        ? formatDateTime(date, locale)
        : `${formatDateTime(date, locale, "UTC")} UTC`;

  return (
    <time dateTime={iso} title={formatUtc(date)} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
