/**
 * Phase 0 browser-side analytics emission helper.
 *
 * Lightweight, fire-and-forget, never throws. Respects
 * `NEXT_PUBLIC_NEBUTRA_TELEMETRY=0` opt-out.
 *
 * Uses the PostHog `/capture/` endpoint directly so we don't need to pull
 * in posthog-js as a new dependency in this file — the final
 * `@nebutra/analytics` browser wrapper (parallel subagent B) will replace
 * this once its contract is finalised.
 */

const DEFAULT_POSTHOG_HOST = "https://analytics.nebutra.com";

export interface EmitOptions {
  /** Pass `true` from a caller that has already opted the user out. */
  noTelemetry?: boolean;
}

function isTelemetryDisabled(opts: EmitOptions = {}): boolean {
  if (opts.noTelemetry === true) return true;
  if (typeof process !== "undefined") {
    const envValue = process.env.NEXT_PUBLIC_NEBUTRA_TELEMETRY;
    if (envValue === "0" || envValue === "false") return true;
  }
  return false;
}

function resolveKey(): string | null {
  if (typeof process === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return key && key.length > 0 ? key : null;
}

function resolveHost(): string {
  if (typeof process === "undefined") return DEFAULT_POSTHOG_HOST;
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST;
}

/**
 * Emit a PostHog event from the browser. Fire-and-forget.
 *
 * We don't send distinct_id from here — PostHog's capture API requires
 * one, so we best-effort synthesise an anonymous per-session id from
 * `sessionStorage`. A real identified user id will be bound by the
 * upcoming `@nebutra/analytics` wrapper.
 */
export function emitBrowserEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  opts: EmitOptions = {},
): void {
  if (isTelemetryDisabled(opts)) return;
  if (typeof window === "undefined") return;

  const apiKey = resolveKey();
  if (!apiKey) return;

  try {
    const distinctId = getAnonymousDistinctId();
    const host = resolveHost();
    const payload = {
      api_key: apiKey,
      event: eventName,
      properties: {
        ...properties,
        distinct_id: distinctId,
        $current_url:
          typeof window.location !== "undefined" ? window.location.href : undefined,
      },
      timestamp: new Date().toISOString(),
    };

    // Prefer sendBeacon when available — survives page-navigations which
    // is critical for wizard submit → redirect flows.
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(`${host}/capture/`, blob);
      return;
    }

    // Fallback — fire-and-forget fetch. Errors silently swallowed.
    void fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silent
    });
  } catch {
    // Silent — analytics outages must never break UX.
  }
}

function getAnonymousDistinctId(): string {
  try {
    const STORAGE_KEY = "nebutra_anon_distinct_id";
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = `anon_${Math.random().toString(36).slice(2)}${Date.now()}`;
    window.sessionStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return `anon_${Date.now()}`;
  }
}
