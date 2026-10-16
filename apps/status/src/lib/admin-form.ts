/**
 * Turning admin form fields into the backend's incident input. Pure, so the
 * language rules are tested: the page's default language carries the base
 * message, every other filled language goes into messageI18n.
 */
import { type AppLocale, pageLocales } from "./locale";

export function messageFieldName(locale: AppLocale): string {
  return `message:${locale}`;
}

export function localizedMessage(
  read: (name: string) => string | null,
  locales: readonly string[],
): { message: string; messageI18n?: Record<string, string> } | null {
  const ordered = pageLocales(locales);
  const filled = ordered
    .map((l) => ({ locale: l, text: (read(messageFieldName(l)) ?? "").trim() }))
    .filter((e) => e.text.length > 0);
  const base = filled[0];
  if (!base) return null;
  const rest = filled.slice(1);
  return rest.length === 0
    ? { message: base.text }
    : { message: base.text, messageI18n: Object.fromEntries(rest.map((e) => [e.locale, e.text])) };
}

/** Status options that make sense next, in lifecycle order. */
export const INCIDENT_STATUSES = ["investigating", "identified", "monitoring", "resolved"] as const;

export function nextStatus(current: string): (typeof INCIDENT_STATUSES)[number] {
  const index = INCIDENT_STATUSES.indexOf(current as (typeof INCIDENT_STATUSES)[number]);
  if (index < 0) return "investigating";
  return INCIDENT_STATUSES[Math.min(index + 1, INCIDENT_STATUSES.length - 1)] ?? "resolved";
}

/** A `datetime-local` value read in the browser's zone, as an ISO instant. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
