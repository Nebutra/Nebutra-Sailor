/**
 * Phase 0 analytics emission helper for create-sailor.
 *
 * Fire-and-forget: never blocks the user flow, never throws, silently drops
 * errors. Respects `NEBUTRA_TELEMETRY=0` opt-out env var.
 *
 * Product events go through `createProductAnalyticsClient`; Dub attribution
 * remains on `createAnalyticsClient` and must not be used for PostHog capture.
 * The import stays dynamic so runtime can no-op when the analytics package is
 * not available on the user's machine.
 */

const POSTHOG_DEFAULT_HOST = "https://analytics.nebutra.com";

export interface ScaffoldCompletionProps {
  template_version: string;
  package_manager: string;
  region: string;
  auth: string;
  payment: string;
  ai_providers: string[];
  deploy_target: string;
  duration_ms: number;
}

export interface EmitOptions {
  noTelemetry?: boolean;
}

/**
 * Returns true when telemetry is disabled via env var or opt-out flag.
 */
export function isTelemetryDisabled(opts: EmitOptions = {}): boolean {
  if (opts.noTelemetry === true) return true;
  const envValue = process.env.NEBUTRA_TELEMETRY;
  return envValue === "0" || envValue === "false";
}

/**
 * Emit `scaffold.completed` as fire-and-forget. Returns immediately; the
 * caller MUST NOT await. Errors are swallowed — analytics outages must never
 * break user scaffolding.
 */
export function emitScaffoldCompleted(
  props: ScaffoldCompletionProps,
  opts: EmitOptions = {},
): void {
  if (isTelemetryDisabled(opts)) return;

  // Fire-and-forget — wrap in async IIFE so we never block.
  void (async () => {
    try {
      // Optional peer — resolved at runtime; absence is handled by the
      // surrounding try/catch and the `typeof createProductAnalyticsClient` guard below.
      const mod = (await import("@nebutra/analytics")) as unknown as {
        createProductAnalyticsClient?: (config: unknown) => {
          track: (event: string, props: Record<string, unknown>) => Promise<unknown> | unknown;
        };
      };

      if (typeof mod.createProductAnalyticsClient !== "function") return;

      const client = mod.createProductAnalyticsClient({
        posthog: {
          apiKey:
            process.env.POSTHOG_KEY ??
            process.env.NEXT_PUBLIC_POSTHOG_KEY ??
            process.env.NEBUTRA_POSTHOG_KEY ??
            "",
          host:
            process.env.POSTHOG_HOST ??
            process.env.NEXT_PUBLIC_POSTHOG_HOST ??
            process.env.NEBUTRA_POSTHOG_HOST ??
            POSTHOG_DEFAULT_HOST,
        },
        onError: () => {
          // Silent — telemetry failures cannot spam users during scaffold.
        },
      });

      if (typeof client?.track !== "function") return;

      const result = client.track(
        "scaffold.completed",
        props as unknown as Record<string, unknown>,
      );
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await (result as Promise<unknown>).catch(() => {
          // Silent
        });
      }
    } catch {
      // Silent — analytics failures must not surface.
    }
  })();
}
