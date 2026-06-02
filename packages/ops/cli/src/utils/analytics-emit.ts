/**
 * Phase 0 analytics emission helper for the `nebutra` CLI.
 *
 * Fire-and-forget, silent-fail, honours `NEBUTRA_TELEMETRY=0`.
 * Product events go through `createProductAnalyticsClient`; Dub attribution
 * remains on `createAnalyticsClient` and must not be used for PostHog capture.
 * Imports are dynamic so the CLI still works even when the analytics package is
 * unavailable at runtime.
 */

const POSTHOG_DEFAULT_HOST = "https://analytics.nebutra.com";

export type LicenseCliAction = "activate_attempted" | "activated" | "failed";

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

function resolveCliVersion(): string {
  return process.env.npm_package_version ?? "0.0.0-dev";
}

/**
 * Emit a `license.cli` event. Fire-and-forget. Never throws.
 */
export function emitLicenseCliEvent(props: LicenseCliEventProps, opts: EmitOptions = {}): void {
  if (isTelemetryDisabled(opts)) return;

  void (async () => {
    try {
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
          // Silent — CLI must not spew telemetry errors.
        },
      });

      if (typeof client?.track !== "function") return;

      const result = client.track("license.cli", {
        action: props.action,
        cli_version: resolveCliVersion(),
        ...(props.tier ? { license_tier: props.tier } : {}),
        ...(props.type ? { license_type: props.type } : {}),
        ...(props.error_code ? { error_code: props.error_code } : {}),
      });
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
