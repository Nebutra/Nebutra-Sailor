import { beforeEach, describe, expect, it } from "vitest";
import { createWaitlist } from "../index";

describe("Waitlist", () => {
  let waitlist: ReturnType<typeof createWaitlist>;

  beforeEach(() => {
    waitlist = createWaitlist({ storage: "memory" });
  });

  describe("join", () => {
    it("adds a new email to the waitlist", async () => {
      const entry = await waitlist.join({ email: "user@example.com" });
      expect(entry.email).toBe("user@example.com");
      expect(entry.position).toBe(1);
      expect(entry.referralCode).toBeDefined();
      expect(entry.referralCode.length).toBeGreaterThan(0);
    });

    it("assigns sequential positions", async () => {
      await waitlist.join({ email: "first@test.com" });
      const second = await waitlist.join({ email: "second@test.com" });
      const third = await waitlist.join({ email: "third@test.com" });
      expect(second.position).toBe(2);
      expect(third.position).toBe(3);
    });

    it("rejects duplicate emails", async () => {
      await waitlist.join({ email: "user@test.com" });
      await expect(waitlist.join({ email: "user@test.com" })).rejects.toThrow(
        "already on the waitlist",
      );
    });

    it("validates email format", async () => {
      await expect(waitlist.join({ email: "not-an-email" })).rejects.toThrow();
    });

    it("tracks referral source", async () => {
      const first = await waitlist.join({ email: "first@test.com" });
      const second = await waitlist.join({
        email: "second@test.com",
        referredBy: first.referralCode,
      });
      expect(second.referredBy).toBe(first.referralCode);
    });

    it("increments referral count for referrer", async () => {
      const first = await waitlist.join({ email: "first@test.com" });
      await waitlist.join({
        email: "second@test.com",
        referredBy: first.referralCode,
      });

      const updated = await waitlist.getByEmail("first@test.com");
      expect(updated?.referralCount).toBe(1);
    });

    it("stores optional metadata", async () => {
      const entry = await waitlist.join({
        email: "user@test.com",
        metadata: { source: "landing-page", plan: "pro" },
      });
      expect(entry.metadata).toEqual({ source: "landing-page", plan: "pro" });
    });
  });

  describe("getByEmail", () => {
    it("returns entry for existing email", async () => {
      await waitlist.join({ email: "user@test.com" });
      const entry = await waitlist.getByEmail("user@test.com");
      expect(entry).not.toBeNull();
      expect(entry!.email).toBe("user@test.com");
    });

    it("returns null for unknown email", async () => {
      const entry = await waitlist.getByEmail("unknown@test.com");
      expect(entry).toBeNull();
    });
  });

  describe("getPosition", () => {
    it("returns current position", async () => {
      await waitlist.join({ email: "first@test.com" });
      await waitlist.join({ email: "second@test.com" });
      const pos = await waitlist.getPosition("second@test.com");
      expect(pos).toBe(2);
    });

    it("returns null for unknown email", async () => {
      const pos = await waitlist.getPosition("unknown@test.com");
      expect(pos).toBeNull();
    });
  });

  describe("getStats", () => {
    it("returns total count", async () => {
      await waitlist.join({ email: "a@test.com" });
      await waitlist.join({ email: "b@test.com" });
      await waitlist.join({ email: "c@test.com" });
      const stats = await waitlist.getStats();
      expect(stats.total).toBe(3);
    });

    it("returns zero for empty waitlist", async () => {
      const stats = await waitlist.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe("admit", () => {
    it("marks entry as admitted", async () => {
      await waitlist.join({ email: "user@test.com" });
      const admitted = await waitlist.admit("user@test.com");
      expect(admitted.status).toBe("admitted");
      expect(admitted.admittedAt).toBeDefined();
    });

    it("throws for unknown email", async () => {
      await expect(waitlist.admit("unknown@test.com")).rejects.toThrow("not found");
    });
  });

  describe("list", () => {
    it("returns paginated entries", async () => {
      for (let i = 0; i < 5; i++) {
        await waitlist.join({ email: `user${i}@test.com` });
      }
      const page = await waitlist.list({ limit: 3, offset: 0 });
      expect(page.entries).toHaveLength(3);
      expect(page.total).toBe(5);
    });

    it("respects offset", async () => {
      for (let i = 0; i < 5; i++) {
        await waitlist.join({ email: `user${i}@test.com` });
      }
      const page = await waitlist.list({ limit: 3, offset: 3 });
      expect(page.entries).toHaveLength(2);
    });
  });
});
