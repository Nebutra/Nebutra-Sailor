/**
 * Number, time and duration formatting for the public pages. Pure, so the
 * rules that decide what a reader is told are tested without a browser.
 */
import type { AppLocale } from "./locale";

/**
 * Two decimals, like every hosted status page — truncated, never rounded, so
 * 99.996% is never shown as a claimed 100%.
 */
export function formatUptime(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return `${(Math.floor(pct * 100 + 1e-9) / 100).toFixed(2)}%`;
}

export function formatLatency(ms: number | null | undefined, locale: AppLocale): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms >= 1000) {
    const s = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(ms / 1000);
    return locale === "zh-CN" ? `${s} 秒` : `${s}s`;
  }
  return locale === "zh-CN" ? `${Math.round(ms)} 毫秒` : `${Math.round(ms)}ms`;
}

/** "2h 5m" / "2 小时 5 分钟". Under a minute reads as one minute; days drop minutes. */
export function formatDuration(ms: number, locale: AppLocale): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const zh = locale === "zh-CN";
  const parts: string[] = [];
  if (days > 0) {
    parts.push(zh ? `${days} 天` : `${days}d`);
    if (hours > 0) parts.push(zh ? `${hours} 小时` : `${hours}h`);
  } else {
    if (hours > 0) parts.push(zh ? `${hours} 小时` : `${hours}h`);
    if (mins > 0) parts.push(zh ? `${mins} 分钟` : `${mins}m`);
  }
  return parts.join(" ");
}

/** "2 分钟前" / "2 minutes ago", choosing the largest whole unit. */
export function formatRelative(date: Date, now: Date, locale: AppLocale): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 5) return rtf.format(0, "second");
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86_400), "day");
}

/** Absolute UTC timestamp for tooltips: "2026-10-16 08:05 UTC". */
export function formatUtc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** A YYYY-MM-DD key rendered as a date, read in UTC so it never shifts a day. */
export function formatDayKey(dayKey: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00.000Z`));
}

export function formatMonth(year: number, month: number, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 15)));
}

/** Local date-time in the viewer's zone (or the zone given, for tests). */
export function formatDateTime(date: Date, locale: AppLocale, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

/** "23 分钟" / "23 min" — an age without "ago", for "silent for …". */
export function formatAge(seconds: number, locale: AppLocale): string {
  const zh = locale === "zh-CN";
  if (seconds < 60)
    return zh ? `${Math.max(1, Math.round(seconds))} 秒` : `${Math.max(1, Math.round(seconds))}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 120) return zh ? `${minutes} 分钟` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return zh ? `${hours} 小时` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return zh ? `${days} 天` : `${days} d`;
}
