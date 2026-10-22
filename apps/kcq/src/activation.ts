import type { KcqActivationPayload } from "@nebutra/analytics/events";
import {
  type AnalyticsClientOptions,
  createProductAnalyticsClient,
} from "@nebutra/analytics/track";

const CONSENT_KEY = "nebutra_consent_v1";
interface ActivationOptions {
  storage: Pick<Storage, "getItem" | "setItem">;
  doNotTrack: () => boolean;
  config: AnalyticsClientOptions;
}

/** No persistent identity, replay, prompt capture, pre-consent buffering or autocapture. */
export function createActivationAnalytics({ storage, doNotTrack, config }: ActivationOptions) {
  let client: ReturnType<typeof createProductAnalyticsClient> | undefined;
  let revoked = false;
  function getConsent(): boolean {
    if (revoked) return false;
    try {
      return JSON.parse(storage.getItem(CONSENT_KEY) ?? "null")?.analytics === true;
    } catch {
      return false;
    }
  }
  function setConsent(analytics: boolean): boolean {
    if (!analytics) {
      client = undefined;
      revoked = true;
    }
    try {
      let previous: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(storage.getItem(CONSENT_KEY) ?? "null");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
          previous = parsed as Record<string, unknown>;
      } catch {
        /* Invalid consent is replaced only after an explicit choice. */
      }
      storage.setItem(
        CONSENT_KEY,
        JSON.stringify({
          ...previous,
          necessary: true,
          analytics,
          decidedAt: new Date().toISOString(),
        }),
      );
      revoked = !analytics;
      return true;
    } catch {
      return false;
    }
  }
  async function track(properties: KcqActivationPayload): Promise<void> {
    try {
      if (!getConsent()) {
        client = undefined;
        return;
      }
      if (doNotTrack() || !config.posthog) return;
      client ??= createProductAnalyticsClient({
        ...config,
        distinctId: `kcq-anon-${crypto.randomUUID()}`,
      });
      await client.track("kcq.activation", properties);
    } catch {
      // Diagnostics never interrupt chart interaction, even in restricted browsers.
    }
  }
  return { getConsent, setConsent, track };
}
