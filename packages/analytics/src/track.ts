/**
 * Product analytics tracker — thin PostHog Capture API wrapper with
 * compile-time + runtime event validation.
 *
 * Design principles:
 *   1. Validate before the network call (drop bad payloads early).
 *   2. Fire-and-forget: `track()` never throws — it returns a TrackResult.
 *   3. Browser-safe: uses global `fetch`, no Node-only imports.
 */
import { EVENT_SCHEMAS, type EventName, type EventPayload } from "./events";

export interface AnalyticsClientOptions {
  posthog?: {
    apiKey: string;
    /** PostHog host. Defaults to https://app.posthog.com (cloud). */
    host?: string;
  };
  umami?: {
    websiteId: string;
    host?: string;
  };
  /** Invoked when a network/transport error occurs. Never rethrow. */
  onError?: (err: unknown, event: string) => void;
}

export interface TrackResult {
  success: boolean;
  error?: string;
}

export interface ProductAnalyticsClient {
  track<E extends EventName>(
    event: E,
    properties: EventPayload<E> | Record<string, unknown>,
  ): Promise<TrackResult>;
  identify(userId: string, traits?: Record<string, unknown>): Promise<void>;
  flush(): Promise<void>;
}

const DEFAULT_POSTHOG_HOST = "https://app.posthog.com";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Create a product analytics client for PostHog CE.
 *
 * When no provider is configured, `track()` and `identify()` become no-ops
 * that resolve successfully — useful for local development without real keys.
 */
export function createProductAnalyticsClient(
  opts: AnalyticsClientOptions,
): ProductAnalyticsClient {
  const posthogHost = opts.posthog?.host ?? DEFAULT_POSTHOG_HOST;

  return {
    async track(event, properties) {
      const schema = EVENT_SCHEMAS[event as EventName];
      if (!schema) {
        return { success: false, error: `Unknown event: ${String(event)}` };
      }

      const parsed = schema.safeParse(properties);
      if (!parsed.success) {
        return {
          success: false,
          error: `validation failed: ${parsed.error.message}`,
        };
      }

      // No provider — treat as a local-dev no-op.
      if (!opts.posthog) {
        return { success: true };
      }

      const data = parsed.data as Record<string, unknown>;
      const distinctId =
        typeof data.userId === "string" && data.userId.length > 0
          ? data.userId
          : "anonymous";
      const timestamp =
        typeof data.timestamp === "string"
          ? data.timestamp
          : new Date().toISOString();

      try {
        const res = await fetch(`${posthogHost}/capture/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: opts.posthog.apiKey,
            event,
            distinct_id: distinctId,
            properties: data,
            timestamp,
          }),
        });
        if (!res.ok) {
          const msg = `PostHog ${res.status}`;
          opts.onError?.(new Error(msg), event);
          return { success: false, error: msg };
        }
        return { success: true };
      } catch (err) {
        opts.onError?.(err, event);
        return { success: false, error: errorMessage(err) };
      }
    },

    async identify(userId, traits) {
      if (!opts.posthog) return;
      try {
        const res = await fetch(`${posthogHost}/capture/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: opts.posthog.apiKey,
            event: "$identify",
            distinct_id: userId,
            $set: traits ?? {},
          }),
        });
        if (!res.ok) {
          opts.onError?.(new Error(`PostHog ${res.status}`), "$identify");
        }
      } catch (err) {
        opts.onError?.(err, "$identify");
      }
    },

    async flush() {
      // No buffering in v1 — every track is a direct HTTP call.
    },
  };
}
