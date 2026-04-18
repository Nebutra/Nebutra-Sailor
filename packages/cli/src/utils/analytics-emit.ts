/**
 * Phase 0 analytics emission helper for the `nebutra` CLI.
 *
 * Fire-and-forget, silent-fail, honours `NEBUTRA_TELEMETRY=0`.
 * The `@nebutra/analytics` PostHog contract is being finalised by a parallel
 * subagent; imports are dynamic so the CLI still works even when the
 * analytics package is unavailable at runtime.
 */

const POSTHOG_DEFAULT_HOST = "https://analytics.nebutra.com";

export type LicenseCliAction =
  | "activate_attempted"
  | "activated"
  | "failed";

export interface LicenseCliEventProps {
  action: LicenseCliAction;
  /** Error code / category when action === "failed". */
  error_code?: string;
  /** License tier when known (on success). */
  tier?: string;
  /** License type when known (on success). */
  type?: string;
}

export interface EmitOptions {
  noTelemetry?: boolean;
}

export function isTelemetryDisabled(opts: EmitOptions = {}): boolean {
  if (opts.noTelemetry === true) return true;
  const envValue = process.env.NEBUTRA_TELEMETRY;
  return envValue === "0" || envValue === "false";
}

/**
 * Emit a `license.cli` event. Fire-and-forget. Never throws.
 */
export function emitLicenseCliEvent(
  props: LicenseCliEventProps,
  opts: EmitOptions = {},
): void {
  if (isTelemetryDisabled(opts)) return;

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
          // Silent — CLI must not spew telemetry errors.
        },
      });

      if (typeof client?.track !== "function") return;

      const result = client.track("license.cli", props);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await (result as Promise<unknown>).catch(() => {
          // Silent
        });
      }
    } catch {
      // Silent
    }
  })();
}
