import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveNotificationRuntimeStatus } from "../runtime";
import { loadNotificationSettingsSnapshot } from "../settings";

describe("notification runtime status", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports preview mode for the default direct provider with no durable adapters", () => {
    const status = resolveNotificationRuntimeStatus();

    expect(status).toEqual(
      expect.objectContaining({
        provider: "direct",
        mode: "preview",
        canManagePreferences: false,
        canViewInbox: false,
        canMarkInboxRead: false,
        missing: ["Persistent preference storage", "Persistent in-app inbox storage"],
      }),
    );
  });

  it("surfaces preview status in settings when no durable adapters are configured", async () => {
    const snapshot = await loadNotificationSettingsSnapshot({
      userId: "user_alpha",
      tenantId: "org_alpha",
    });

    expect(snapshot.runtime).toEqual(
      expect.objectContaining({
        provider: "direct",
        mode: "preview",
      }),
    );
    expect(snapshot.preferenceSource).toBe("catalog-defaults");
    expect(snapshot.inboxSource).toBe("unavailable");
  });
});
