import type { AdminColumn } from "@nebutra/contracts/admin";

/**
 * Pure presentation helpers for the generic renderer. No React here so the
 * column → text mapping can be unit-tested without a DOM.
 */

export type StatusTone = "ok" | "warn" | "bad" | "unknown";

const TONE_WORDS: Record<StatusTone, readonly string[]> = {
  ok: ["healthy", "ok", "active", "online", "ready", "synced", "stable", "enabled"],
  warn: ["degraded", "warn", "warning", "expired", "pending", "raised", "drift", "stale"],
  bad: ["down", "error", "failed", "critical", "unreachable", "disabled", "revoked"],
  unknown: [],
};

/** Classify a status-like value; anything unrecognised is `unknown`, never green. */
export function statusTone(value: unknown): StatusTone {
  if (typeof value !== "string") return "unknown";
  const word = value.trim().toLowerCase();
  for (const tone of ["ok", "warn", "bad"] as const) {
    if (TONE_WORDS[tone].includes(word)) return tone;
  }
  return "unknown";
}

/** "12 s ago" / "3 min ago" / "2 h ago" / "6 d ago"; future stamps read "in …". */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "—";
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return String(iso);
  const diff = now - at;
  const abs = Math.abs(diff);
  const unit =
    abs < 60_000
      ? `${Math.max(1, Math.round(abs / 1_000))} s`
      : abs < 3_600_000
        ? `${Math.round(abs / 60_000)} min`
        : abs < 86_400_000
          ? `${Math.round(abs / 3_600_000)} h`
          : `${Math.round(abs / 86_400_000)} d`;
  return diff >= 0 ? `${unit} ago` : `in ${unit}`;
}

/** Text for one cell, by column kind. Empty values render as an em dash. */
export function cellText(column: Pick<AdminColumn, "kind">, value: unknown, now?: number): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((v) => cellText({ kind: "text" }, v, now)).join(", ");
  switch (column.kind) {
    case "number":
      return typeof value === "number" ? value.toLocaleString("en-US") : String(value);
    case "time":
      return typeof value === "string" ? relativeTime(value, now) : String(value);
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

/** Deployment environment label for the top bar. */
export function environmentLabel(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEBUTRA_ENV?.trim();
  if (explicit) return explicit;
  return env.NODE_ENV === "production" ? "production" : "development";
}
