import { describe, expect, it } from "vitest";
import {
  buildPreferenceMatrix,
  DEFAULT_NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_EVENT_TYPES,
  isChannelVisibleForUser,
  type NotificationPreferenceMap,
  type NotificationUserCapabilities,
  togglePreferenceCell,
} from "@/lib/notification-preferences";

describe("notification-preferences helper", () => {
  describe("DEFAULT_NOTIFICATION_EVENT_TYPES", () => {
    it("contains the canonical 6 event types covering security, billing, team, and product", () => {
      const ids = DEFAULT_NOTIFICATION_EVENT_TYPES.map((entry) => entry.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "account.security",
          "account.billing",
          "team.invitation",
          "team.activity",
          "product.updates",
          "product.marketing",
        ]),
      );
      expect(ids.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("DEFAULT_NOTIFICATION_CHANNELS", () => {
    it("includes in_app, email, push, and sms in canonical order", () => {
      const ids = DEFAULT_NOTIFICATION_CHANNELS.map((channel) => channel.id);
      expect(ids).toEqual(["in_app", "email", "push", "sms"]);
    });

    it("flags in_app and email as alwaysAvailable, push and sms as gated", () => {
      const inApp = DEFAULT_NOTIFICATION_CHANNELS.find((c) => c.id === "in_app");
      const sms = DEFAULT_NOTIFICATION_CHANNELS.find((c) => c.id === "sms");
      expect(inApp?.alwaysAvailable).toBe(true);
      expect(sms?.alwaysAvailable).toBe(false);
      expect(sms?.requiresCapability).toBe("phoneVerified");
    });
  });

  describe("isChannelVisibleForUser", () => {
    const baseCaps: NotificationUserCapabilities = {
      hasPushSubscription: false,
      phoneVerified: false,
    };

    it("always shows in_app and email regardless of capabilities", () => {
      const inApp = DEFAULT_NOTIFICATION_CHANNELS.find((c) => c.id === "in_app")!;
      const email = DEFAULT_NOTIFICATION_CHANNELS.find((c) => c.id === "email")!;
      expect(isChannelVisibleForUser(inApp, baseCaps)).toBe(true);
      expect(isChannelVisibleForUser(email, baseCaps)).toBe(true);
    });

    it("hides push when user has no push subscription", () => {
      const push = DEFAULT_NOTIFICATION_CHANNELS.find((c) => c.id === "push")!;
      expect(isChannelVisibleForUser(push, baseCaps)).toBe(false);
      expect(isChannelVisibleForUser(push, { ...baseCaps, hasPushSubscription: true })).toBe(true);
    });

    it("hides sms unless phone is verified", () => {
      const sms = DEFAULT_NOTIFICATION_CHANNELS.find((c) => c.id === "sms")!;
      expect(isChannelVisibleForUser(sms, baseCaps)).toBe(false);
      expect(isChannelVisibleForUser(sms, { ...baseCaps, phoneVerified: true })).toBe(true);
    });
  });

  describe("buildPreferenceMatrix", () => {
    it("returns a row per event type with cells for visible channels only", () => {
      const matrix = buildPreferenceMatrix({
        preferences: {},
        capabilities: { hasPushSubscription: false, phoneVerified: false },
      });

      expect(matrix.rows).toHaveLength(DEFAULT_NOTIFICATION_EVENT_TYPES.length);
      const firstRow = matrix.rows[0]!;
      const cellChannels = firstRow.cells.map((cell) => cell.channel);
      expect(cellChannels).toEqual(["in_app", "email"]);
    });

    it("includes push and sms when capabilities allow", () => {
      const matrix = buildPreferenceMatrix({
        preferences: {},
        capabilities: { hasPushSubscription: true, phoneVerified: true },
      });

      const cellChannels = matrix.rows[0]?.cells.map((cell) => cell.channel);
      expect(cellChannels).toEqual(["in_app", "email", "push", "sms"]);
    });

    it("uses default enabled state when no preference exists", () => {
      const matrix = buildPreferenceMatrix({
        preferences: {},
        capabilities: { hasPushSubscription: true, phoneVerified: true },
      });

      // account.security defaults to in_app + email enabled
      const securityRow = matrix.rows.find((row) => row.id === "account.security")!;
      const inAppCell = securityRow.cells.find((c) => c.channel === "in_app")!;
      const emailCell = securityRow.cells.find((c) => c.channel === "email")!;
      expect(inAppCell.enabled).toBe(true);
      expect(emailCell.enabled).toBe(true);
    });

    it("respects user-supplied preference overrides", () => {
      const preferences: NotificationPreferenceMap = {
        "product.marketing": { in_app: false, email: false },
      };
      const matrix = buildPreferenceMatrix({
        preferences,
        capabilities: { hasPushSubscription: false, phoneVerified: false },
      });

      const marketingRow = matrix.rows.find((row) => row.id === "product.marketing")!;
      expect(marketingRow.cells.every((cell) => cell.enabled === false)).toBe(true);
    });
  });

  describe("togglePreferenceCell", () => {
    it("returns a new preferences object with the toggled value (immutable)", () => {
      const original: NotificationPreferenceMap = {
        "account.security": { in_app: true, email: true },
      };
      const next = togglePreferenceCell(original, "account.security", "email", false);

      expect(next).not.toBe(original);
      expect(next["account.security"]?.email).toBe(false);
      expect(next["account.security"]?.in_app).toBe(true);
      expect(original["account.security"]?.email).toBe(true); // not mutated
    });

    it("creates a new event type entry when none exists", () => {
      const next = togglePreferenceCell({}, "team.invitation", "in_app", false);
      expect(next["team.invitation"]?.in_app).toBe(false);
    });
  });
});
