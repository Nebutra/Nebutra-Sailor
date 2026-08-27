import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveNotificationRuntimeStatus } from "../runtime";
import { loadNotificationSettingsSnapshot } from "../settings";

describe("notification runtime status", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports degraded runtime when Novu is selected without an API key", () => {
    const status = resolveNotificationRuntimeStatus({
      env: {
        NOTIFICATION_PROVIDER: "novu",
      } as NodeJS.ProcessEnv,
    });

    expect(status).toEqual(
      expect.objectContaining({
        provider: "novu",
        mode: "degraded",
        canManagePreferences: false,
        canViewInbox: false,
        canMarkInboxRead: false,
        missing: ["NOVU_API_KEY"],
      }),
    );
  });

  it("surfaces degraded Novu status in settings when provider creation fails", async () => {
    vi.stubEnv("NOTIFICATION_PROVIDER", "novu");
    vi.stubEnv("NOVU_API_KEY", "");

    const snapshot = await loadNotificationSettingsSnapshot({
      userId: "user_alpha",
      tenantId: "org_alpha",
    });

    expect(snapshot.runtime).toEqual(
      expect.objectContaining({
        provider: "novu",
        mode: "degraded",
        missing: ["NOVU_API_KEY"],
      }),
    );
    expect(snapshot.preferenceSource).toBe("catalog-defaults");
    expect(snapshot.inboxSource).toBe("unavailable");
  });
});
