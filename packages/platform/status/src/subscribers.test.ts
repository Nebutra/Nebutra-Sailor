import { afterEach, describe, expect, it } from "vitest";
import { alertMail, confirmationMail, incidentMail } from "./mail";
import { getStatusKv } from "./store";
import {
  confirmSubscription,
  listConfirmedSubscribers,
  requestSubscription,
  unsubscribe,
} from "./subscribers";

afterEach(async () => {
  await getStatusKv().clear?.();
});

const ctx = { mailer: async () => {}, origin: "https://status.example.com/", pageName: "Acme" };

describe("subscriptions", () => {
  it("needs the emailed link before an address receives updates", async () => {
    const request = await requestSubscription("  Ops@Example.com ");
    expect(request.kind).toBe("pending");
    if (request.kind !== "pending") return;
    expect(request.subscriber.email).toBe("ops@example.com");
    expect(await listConfirmedSubscribers()).toHaveLength(0);

    await confirmSubscription(request.subscriber.token);
    expect((await listConfirmedSubscribers()).map((s) => s.email)).toEqual(["ops@example.com"]);
    expect((await requestSubscription("ops@example.com")).kind).toBe("already-confirmed");

    expect(await unsubscribe(request.subscriber.token)).toBe(true);
    expect(await listConfirmedSubscribers()).toHaveLength(0);
  });

  it("sends at most one confirmation per address per window", async () => {
    expect((await requestSubscription("a@example.com")).kind).toBe("pending");
    expect((await requestSubscription("a@example.com")).kind).toBe("throttled");
  });

  it("rejects a token it never issued", async () => {
    expect(await confirmSubscription("nope")).toBeNull();
    expect(await unsubscribe("nope")).toBe(false);
  });
});

describe("mail", () => {
  const subscriber = {
    email: "a@example.com",
    token: "tok",
    confirmed: true,
    createdAt: "2026-09-28T00:00:00.000Z",
  };

  it("links confirmation and one-click unsubscribe to the subscriber's token", () => {
    expect(confirmationMail(ctx, subscriber).html).toContain(
      "https://status.example.com/subscription?action=confirm&amp;token=tok",
    );
    const mail = incidentMail(
      ctx,
      {
        id: "i1",
        title: "API <errors>",
        impact: "major",
        status: "investigating",
        message: "Looking",
        affectedServiceIds: [],
        updates: [{ at: "2026-09-28T00:00:00.000Z", status: "investigating", message: "Looking" }],
        createdAt: "2026-09-28T00:00:00.000Z",
        updatedAt: "2026-09-28T00:00:00.000Z",
        kind: "incident",
      },
      subscriber,
    );
    expect(mail.subject).toBe("[Acme Status] Investigating: API <errors>");
    expect(mail.html).toContain("API &lt;errors&gt;");
    expect(mail.headers?.["List-Unsubscribe"]).toContain("action=unsubscribe&token=tok");
  });

  it("names what went down in the alert subject", () => {
    const mail = alertMail(ctx, "ops@example.com", [
      { id: "api", name: "API", from: "operational", to: "outage", note: "HTTP 503" },
    ]);
    expect(mail.subject).toBe("[Acme alert] API outage");
  });
});
