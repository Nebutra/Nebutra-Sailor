/**
 * Phase 0 analytics emission helper for create-sailor.
 *
 * Fire-and-forget: never blocks the user flow, never throws, silently drops
 * errors. Respects `NEBUTRA_TELEMETRY=0` opt-out env var.
 *
 * The `@nebutra/analytics` PostHog contract is being finalised by a parallel
 * subagent; this module keeps the import dynamic so tests can mock-import
 * without requiring the final schema, and runtime can no-op when the
 * package isn't available on the user's machine.
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
      const mod = (await import("@nebutra/analytics")) as unknown as {
        createAnalyticsClient?: (config: unknown) => {
          track: (event: string, props: Record<string, unknown>) => Promise<unknown> | unknown;
        };
      };

      if (typeof mod.createAnalyticsClient !== "function") return;

      const client = mod.createAnalyticsClient({
        posthog: {
          apiKey: process.env.NEBUTRA_POSTHOG_KEY ?? "",
          host: process.env.NEBUTRA_POSTHOG_HOST ?? POSTHOG_DEFAULT_HOST,
        },
        onError: () => {
          // Silent — telemetry failures cannot spam users during scaffold.
        },
      });

      if (typeof client?.track !== "function") return;

      const result = client.track("scaffold.completed", props);
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
