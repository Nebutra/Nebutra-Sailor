import { describe, expect, it } from "vitest";
import {
  getNotificationCatalogEntry,
  getNotificationCatalogGroup,
  NEBUTRA_NOTIFICATION_CATALOG,
  NEBUTRA_NOTIFICATION_CHANNELS,
  NEBUTRA_NOTIFICATION_GROUPS,
  NEBUTRA_NOTIFICATION_SETTINGS_CHANNELS,
} from "../catalog";

describe("NEBUTRA_NOTIFICATION_CHANNELS", () => {
  it("defines all 5 notification channels", () => {
    const ids = NEBUTRA_NOTIFICATION_CHANNELS.map((c) => c.id);
    expect(ids).toEqual(["in_app", "email", "push", "sms", "chat"]);
  });

  it("each channel has label and description", () => {
    for (const channel of NEBUTRA_NOTIFICATION_CHANNELS) {
      expect(channel.label.length).toBeGreaterThan(0);
      expect(channel.description.length).toBeGreaterThan(0);
    }
  });
});

describe("NEBUTRA_NOTIFICATION_SETTINGS_CHANNELS", () => {
  it("exposes only user-configurable channels", () => {
    expect(NEBUTRA_NOTIFICATION_SETTINGS_CHANNELS).toEqual(["in_app", "email", "push"]);
  });
});

describe("NEBUTRA_NOTIFICATION_GROUPS", () => {
  it("defines all 4 groups", () => {
    const ids = NEBUTRA_NOTIFICATION_GROUPS.map((g) => g.id);
    expect(ids).toEqual(["workspace", "billing", "security", "product"]);
  });
});

describe("NEBUTRA_NOTIFICATION_CATALOG", () => {
  it("defines 8 notification types", () => {
    expect(NEBUTRA_NOTIFICATION_CATALOG).toHaveLength(8);
  });

  it("every entry has a valid groupId", () => {
    const groupIds = NEBUTRA_NOTIFICATION_GROUPS.map((g) => g.id);
    for (const entry of NEBUTRA_NOTIFICATION_CATALOG) {
      expect(groupIds).toContain(entry.groupId);
    }
  });

  it("every entry has at least one channel", () => {
    for (const entry of NEBUTRA_NOTIFICATION_CATALOG) {
      expect(entry.channels.length).toBeGreaterThan(0);
    }
  });

  it("defaultChannels are a subset of channels", () => {
    for (const entry of NEBUTRA_NOTIFICATION_CATALOG) {
      for (const dc of entry.defaultChannels) {
        expect(entry.channels).toContain(dc);
      }
    }
  });

  it("all entries include in_app channel", () => {
    for (const entry of NEBUTRA_NOTIFICATION_CATALOG) {
      expect(entry.channels).toContain("in_app");
    }
  });

  it("security notifications default to multiple channels", () => {
    const loginAlert = NEBUTRA_NOTIFICATION_CATALOG.find((e) => e.id === "security.login_alert");
    expect(loginAlert?.defaultChannels.length).toBeGreaterThanOrEqual(3);
  });
});

describe("getNotificationCatalogEntry", () => {
  it("returns entry for known type", () => {
    const entry = getNotificationCatalogEntry("workspace.invitation");
    expect(entry?.id).toBe("workspace.invitation");
    expect(entry?.groupId).toBe("workspace");
  });

  it("returns undefined for unknown type", () => {
    expect(getNotificationCatalogEntry("nonexistent")).toBeUndefined();
  });
});

describe("getNotificationCatalogGroup", () => {
  it("returns group for known id", () => {
    const group = getNotificationCatalogGroup("billing");
    expect(group?.id).toBe("billing");
    expect(group?.label).toContain("Billing");
  });

  it("returns undefined for unknown group", () => {
    expect(getNotificationCatalogGroup("nonexistent")).toBeUndefined();
  });
});
