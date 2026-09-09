/**
 * How the console prints numbers and time.
 *
 * Pure, so they are the same on the server render and in the browser — a
 * `toLocaleString()` scattered through components hydrates differently per
 * machine and, on a money column, differently per user.
 *
 * Time is printed in **UTC** because every window, bucket and daily cap in this
 * product resets at midnight UTC. A console that shows local time next to a cap
 * that resets on another clock produces the same support ticket every day.
 */

/**
 * Money, with enough digits to be true.
 *
 * A single relayed call can cost $0.000042. Two decimals would print that as
 * `$0.00`, which reads as free; six decimals on a $412.10 balance reads as a
 * machine dump. So: small amounts get the precision they need, large ones get
 * cents, and a real zero prints as `0.00` rather than as a rounded-down charge.
 */
export function formatMoney(amount: number, currency = "USD"): string {
  return `${formatAmount(amount)} ${currency}`;
}

export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const magnitude = Math.abs(amount);
  if (magnitude === 0) return "0.00";
  if (magnitude < 0.01) return amount.toFixed(6);
  if (magnitude < 1) return amount.toFixed(4);
  return amount.toFixed(2);
}

/** A price that may not exist. `null` prints as an em dash, never as 0. */
export function formatOptionalAmount(amount: number | null): string {
  return amount === null ? "—" : formatAmount(amount);
}

export function formatTokens(count: number): string {
  if (!Number.isFinite(count)) return "—";
  if (Math.abs(count) < 1000) return String(Math.round(count));
  if (Math.abs(count) < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

export function formatCount(count: number): string {
  return Number.isFinite(count) ? String(Math.round(count)) : "—";
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/** `2026-09-08 14:03 UTC`. Empty input prints an em dash, not `Invalid Date`. */
export function formatDateTime(iso: string | null): string {
  const date = toDate(iso);
  if (!date) return "—";
  return `${formatDate(iso)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

/** `2026-09-08`. */
export function formatDate(iso: string | null): string {
  const date = toDate(iso);
  if (!date) return "—";
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** A bucket label: hourly buckets need the hour, daily ones do not. */
export function formatBucket(iso: string, granularity: "hour" | "day"): string {
  const date = toDate(iso);
  if (!date) return "—";
  if (granularity === "hour")
    return `${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:00`;
  return `${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function formatLatency(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function toDate(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

export type RangeKey = "24h" | "7d" | "30d" | "mtd";

export const RANGE_OPTIONS: ReadonlyArray<{ key: RangeKey; label: string }> = [
  { key: "24h", label: "近 24 小时" },
  { key: "7d", label: "近 7 天" },
  { key: "30d", label: "近 30 天" },
  { key: "mtd", label: "本月至今" },
];

export function parseRange(raw: string | null): RangeKey {
  const found = RANGE_OPTIONS.find((option) => option.key === raw);
  return found ? found.key : "mtd";
}

/**
 * `from` inclusive, `to` exclusive, in UTC — the same contract `parseWindow`
 * enforces server-side, so the console never asks for a window the API would
 * reject or, worse, silently reinterpret.
 */
export function rangeWindow(range: RangeKey, now: Date = new Date()): { from: Date; to: Date } {
  const to = now;
  if (range === "24h") return { from: new Date(to.getTime() - 24 * 3600_000), to };
  if (range === "7d") return { from: new Date(to.getTime() - 7 * 86_400_000), to };
  if (range === "30d") return { from: new Date(to.getTime() - 30 * 86_400_000), to };
  return {
    from: new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1)),
    to,
  };
}

/** Hourly buckets over a day-long window, daily beyond it. */
export function granularityFor(range: RangeKey): "hour" | "day" {
  return range === "24h" ? "hour" : "day";
}

// ---------------------------------------------------------------------------
// Field parsing
// ---------------------------------------------------------------------------

/**
 * A parsed numeric field, or the sentence to show under it.
 *
 * `Number("")` is `0`, which is how the wallet used to post a top-up of zero
 * and get back a 400 it did not explain. Blank is a distinct answer here:
 * either "leave this ceiling unset" or "you have to type an amount", never a
 * silent zero.
 */
export type FieldResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function parseRequiredAmount(
  raw: string,
  bounds: { min: number; max: number },
): FieldResult<number> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "请输入金额。" };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, message: "金额只能是数字。" };
  if (value < bounds.min) return { ok: false, message: `金额至少 ${bounds.min}。` };
  if (value > bounds.max) return { ok: false, message: `单次最多 ${bounds.max}。` };
  return { ok: true, value };
}

/** Blank means "no ceiling" and decodes to `null`, which is what the API wants. */
export function parseOptionalPositive(
  raw: string,
  bounds: { max: number; integer?: boolean },
): FieldResult<number | null> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, message: "只能填数字，留空表示不限。" };
  if (value <= 0) return { ok: false, message: "要大于 0，留空表示不限。" };
  if (bounds.integer && !Number.isInteger(value)) return { ok: false, message: "只能填整数。" };
  if (value > bounds.max) return { ok: false, message: `最大 ${bounds.max}。` };
  return { ok: true, value };
}

/** `2026-10-01` → the end of that day in UTC, so an expiry covers the day typed. */
export function endOfUtcDayIso(date: string): string | null {
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T23:59:59.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** An ISO instant back to the `YYYY-MM-DD` a date field can display. */
export function toDateInputValue(iso: string | null): string {
  const formatted = formatDate(iso);
  return formatted === "—" ? "" : formatted;
}
