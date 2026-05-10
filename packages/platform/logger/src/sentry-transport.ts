/**
 * Optional Sentry bridge for the structured logger.
 *
 * Off by default. Enable with LOGGER_SENTRY_ENABLED=true to forward `error`
 * level entries as Sentry exceptions and `warn` entries as breadcrumbs. Sentry
 * already auto-captures unhandled exceptions, so this transport is mainly for
 * handled errors that you still want surfaced in Sentry.
 *
 * Loaded lazily — if `@sentry/node` is not installed in the host app, the
 * transport silently no-ops rather than throwing.
 */
import type { Meta } from "./types.js";

type SentryLike = {
  captureException: (err: unknown, ctx?: { extra?: Record<string, unknown> }) => void;
  addBreadcrumb: (b: {
    category?: string;
    level?: "warning" | "info" | "error";
    message?: string;
    data?: Record<string, unknown>;
  }) => void;
};

let sentryRef: SentryLike | null = null;
let loadAttempted = false;

async function loadSentry(): Promise<SentryLike | null> {
  if (sentryRef) return sentryRef;
  if (loadAttempted) return null;
  loadAttempted = true;

  if (process.env.LOGGER_SENTRY_ENABLED !== "true") return null;
  if (!process.env.SENTRY_DSN) return null;

  try {
    // Use a runtime require-style dynamic import so bundlers don't try to
    // resolve @sentry/node when the host app hasn't installed it.
    const mod = (await import(/* @vite-ignore */ "@sentry/node").catch(
      () => null,
    )) as SentryLike | null;
    if (mod && typeof mod.captureException === "function") {
      sentryRef = mod;
      return mod;
    }
  } catch {
    // Module not available — feature is opt-in, silently disable.
  }
  return null;
}

export function isSentryTransportEnabled(): boolean {
  return process.env.LOGGER_SENTRY_ENABLED === "true" && !!process.env.SENTRY_DSN;
}

export function forwardErrorToSentry(msg: string, error: unknown, meta?: Meta): void {
  if (!isSentryTransportEnabled()) return;
  void loadSentry().then((sentry) => {
    if (!sentry) return;
    const err = error instanceof Error ? error : new Error(msg);
    sentry.captureException(err, { extra: { logMessage: msg, ...(meta ?? {}) } });
  });
}

export function forwardWarnToSentry(msg: string, meta?: Meta): void {
  if (!isSentryTransportEnabled()) return;
  void loadSentry().then((sentry) => {
    if (!sentry) return;
    sentry.addBreadcrumb({
      category: "logger",
      level: "warning",
      message: msg,
      ...(meta ? { data: meta as Record<string, unknown> } : {}),
    });
  });
}
