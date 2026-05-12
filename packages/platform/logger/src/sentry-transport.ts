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
import type { Meta } from "./types";

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

  // Only attempt the import on the server. `globalThis.window` is undefined on
  // server runtimes (Node + edge); on the browser it's defined. This guard is
  // verifiable at bundle time but is preserved across builds, so the dynamic
  // import below is effectively dead code for client bundles.
  if (typeof globalThis !== "undefined" && "window" in globalThis) return null;

  try {
    // Defeat bundler static analysis with a Function-built dynamic specifier.
    // Turbopack/webpack will trace `await import("@sentry/node")` even when
    // wrapped in `await import(stringVar)` because they do flow analysis on
    // const assignments. Using `Function` to build the call at runtime makes
    // the import target invisible to the bundler. `@sentry/node` then stays
    // out of client and edge bundles where `async_hooks` doesn't exist.
    const dynImport = new Function("p", "return import(p)") as (p: string) => Promise<unknown>;
    const mod = (await dynImport("@sentry/node").catch(() => null)) as SentryLike | null;
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
