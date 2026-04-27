import { describe, expect, it } from "vitest";
import { createNotification } from "../factory";
import { DirectProvider } from "../providers/direct";

describe("DirectProvider", () => {
  it("persists in-app notifications with tenant isolation and read state", async () => {
    const provider = new DirectProvider({ provider: "direct" });

    const result = await provider.send(
      createNotification(
        "invoice.paid",
        "user_1",
        ["in_app"],
        { title: "Invoice paid", body: "Receipt is ready" },
        "tenant_a",
      ),
    );

    expect(result.accepted).toBe(true);
    expect(result.channelResults).toEqual([
      expect.objectContaining({ channel: "in_app", sent: true }),
    ]);

    const tenantAFeed = await provider.getInAppNotifications("user_1", undefined, "tenant_a");
    const tenantBFeed = await provider.getInAppNotifications("user_1", undefined, "tenant_b");

    expect(tenantAFeed.total).toBe(1);
    expect(tenantAFeed.unreadCount).toBe(1);
    expect(tenantAFeed.notifications[0]).toEqual(
      expect.objectContaining({
        tenantId: "tenant_a",
        title: "Invoice paid",
        read: false,
      }),
    );
    expect(tenantBFeed.total).toBe(0);

    const notification = tenantAFeed.notifications[0];
    if (!notification) {
      throw new Error("Expected tenant_a feed to include the created notification");
    }

    await provider.markAsRead(notification.id, "user_1", "tenant_a");

    const updatedFeed = await provider.getInAppNotifications("user_1", undefined, "tenant_a");
    expect(updatedFeed.unreadCount).toBe(0);
    expect(updatedFeed.notifications[0]?.read).toBe(true);
  });

  it("honors channel preferences before dispatching", async () => {
    const provider = new DirectProvider({ provider: "direct" });

    await provider.updatePreferences(
      "user_2",
      [{ channel: "email", enabled: false, disabledCategories: ["invoice.paid"] }],
      "tenant_a",
    );

    const result = await provider.send(
      createNotification(
        "invoice.paid",
        "user_2",
        ["email"],
        { email: "user@example.com", subject: "Invoice paid", body: "Receipt is ready" },
        "tenant_a",
      ),
    );

    expect(result.accepted).toBe(false);
    expect(result.channelResults).toEqual([
      expect.objectContaining({
        channel: "email",
        sent: false,
        error: "Channel disabled by user",
      }),
    ]);
  });
});
