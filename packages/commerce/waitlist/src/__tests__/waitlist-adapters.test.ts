import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryWaitlistStore,
  createPrismaWaitlistStore,
  createWaitlist,
  type PrismaWaitlistDelegate,
  type WaitlistNotificationSink,
  type WaitlistStore,
} from "../index";

describe("Waitlist adapters", () => {
  let notifications: Array<{ event: string; email: string; position?: number }>;
  let notifier: WaitlistNotificationSink;

  beforeEach(() => {
    notifications = [];
    notifier = {
      async sendConfirmation(entry) {
        notifications.push({
          event: "confirmation",
          email: entry.email,
          position: entry.position,
        });
      },
      async sendPositionUpdate(entry) {
        notifications.push({
          event: "position-update",
          email: entry.email,
          position: entry.position,
        });
      },
    };
  });

  it("accepts an injected store so production adapters can share the service contract", async () => {
    const store: WaitlistStore = createMemoryWaitlistStore();
    const waitlist = createWaitlist({ store });

    const entry = await waitlist.join({ email: "adapter@example.com" });

    expect(entry.email).toBe("adapter@example.com");
    expect(await store.getByEmail("adapter@example.com")).toMatchObject({
      email: "adapter@example.com",
      position: 1,
    });
  });

  it("sends confirmation and position update notifications after durable joins", async () => {
    const waitlist = createWaitlist({
      store: createMemoryWaitlistStore(),
      notifications: notifier,
    });

    const entry = await waitlist.join({ email: "notify@example.com" });

    expect(entry.position).toBe(1);
    expect(notifications).toEqual([
      { event: "confirmation", email: "notify@example.com", position: 1 },
      { event: "position-update", email: "notify@example.com", position: 1 },
    ]);
  });

  it("returns referral analytics for campaigns and conversion rates", async () => {
    const waitlist = createWaitlist({ store: createMemoryWaitlistStore() });
    const referrer = await waitlist.join({ email: "referrer@example.com" });

    await waitlist.join({
      email: "converted@example.com",
      referredBy: referrer.referralCode,
      metadata: { campaign: "launch" },
    });
    await waitlist.join({
      email: "direct@example.com",
      metadata: { campaign: "launch" },
    });
    await waitlist.admit("converted@example.com");

    const analytics = await waitlist.getReferralAnalytics();

    expect(analytics.totalReferred).toBe(1);
    expect(analytics.conversionRate).toBe(1);
    expect(analytics.byCampaign).toEqual([
      {
        campaign: "launch",
        signups: 2,
        referred: 1,
        admitted: 1,
      },
    ]);
    expect(analytics.topReferrers).toEqual([
      {
        email: "referrer@example.com",
        referralCode: referrer.referralCode,
        referralCount: 1,
      },
    ]);
  });

  it("lets durable Prisma storage assign the public waitlist position", async () => {
    let createData: Record<string, unknown> | null = null;
    const delegate: PrismaWaitlistDelegate = {
      async create(args) {
        createData = args.data;
        return {
          id: String(args.data.id),
          email: String(args.data.email),
          position: 42,
          referralCode: String(args.data.referralCode),
          referredBy: null,
          referralCount: Number(args.data.referralCount),
          status: "waiting",
          metadata: null,
          createdAt: args.data.createdAt as Date,
          admittedAt: null,
        };
      },
      async findUnique() {
        return null;
      },
      async findMany() {
        return [];
      },
      async count() {
        return 0;
      },
      async update() {
        throw new Error("not needed");
      },
    };

    const waitlist = createWaitlist({ store: createPrismaWaitlistStore(delegate) });
    const entry = await waitlist.join({ email: "durable@example.com" });

    expect(entry.position).toBe(42);
    expect(createData).not.toHaveProperty("position");
  });
});
