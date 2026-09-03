import { Prisma, type WebhookEvent } from "@nebutra/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookEventRepository } from "../webhook-event.repository";
import { acceptWebhookEvent, decideWebhookInbox, WEBHOOK_IN_FLIGHT_MS } from "../webhook-inbox";

function event(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    id: "evt_row",
    provider: "stripe",
    eventId: "evt_1",
    eventType: "invoice.paid",
    payload: {},
    processedAt: null,
    errorMessage: null,
    retryCount: 0,
    createdAt: new Date("2026-08-27T00:00:00.000Z"),
    ...overrides,
  };
}

describe("decideWebhookInbox", () => {
  const now = new Date("2026-08-27T00:00:20.000Z");

  it("skips only after processedAt is persisted", () => {
    expect(
      decideWebhookInbox(event({ processedAt: new Date("2026-08-27T00:00:10.000Z") }), now),
    ).toBe("skip_processed");
  });

  it("retries failed deliveries even when the first claim is recent", () => {
    expect(
      decideWebhookInbox(
        event({
          createdAt: new Date("2026-08-27T00:00:19.000Z"),
          errorMessage: "handler exploded",
        }),
        now,
      ),
    ).toBe("process");
  });

  it("treats a recent unprocessed row as in-flight", () => {
    expect(
      decideWebhookInbox(event({ createdAt: new Date("2026-08-27T00:00:01.000Z") }), now),
    ).toBe("in_flight");
  });

  it("retries a stale pending row after a crash", () => {
    expect(
      decideWebhookInbox(
        event({ createdAt: new Date(now.getTime() - WEBHOOK_IN_FLIGHT_MS - 1) }),
        now,
      ),
    ).toBe("process");
  });
});

describe("acceptWebhookEvent", () => {
  const data = {
    provider: "stripe",
    eventId: "evt_1",
    eventType: "invoice.paid",
    payload: { id: "evt_1" },
  };

  const conflict = () =>
    new Prisma.PrismaClientKnownRequestError("conflict", {
      code: "P2002",
      clientVersion: "test",
    });

  let create: ReturnType<typeof vi.fn>;
  let findUnique: ReturnType<typeof vi.fn>;
  let updateMany: ReturnType<typeof vi.fn>;
  let repo: WebhookEventRepository;

  beforeEach(() => {
    create = vi.fn();
    findUnique = vi.fn();
    updateMany = vi.fn();
    repo = new WebhookEventRepository({
      webhookEvent: { create, findUnique, updateMany },
    } as never);
  });

  it("lets the first insert proceed to processing", async () => {
    const inserted = event();
    create.mockResolvedValueOnce(inserted);

    await expect(acceptWebhookEvent(repo, data)).resolves.toEqual({
      outcome: "process",
      event: inserted,
    });
  });

  it("does not treat a unique conflict as processed", async () => {
    create.mockRejectedValueOnce(conflict());
    findUnique.mockResolvedValueOnce(
      event({ processedAt: null, errorMessage: "previous worker died" }),
    );
    updateMany.mockResolvedValueOnce({ count: 1 });
    findUnique.mockResolvedValueOnce(event({ processedAt: null, errorMessage: null }));

    await expect(acceptWebhookEvent(repo, data)).resolves.toMatchObject({
      outcome: "process",
    });
  });

  it("re-leases a retryable row with a single compare-and-set", async () => {
    const now = new Date("2026-08-27T00:01:00.000Z");
    create.mockRejectedValueOnce(conflict());
    findUnique.mockResolvedValueOnce(event({ errorMessage: "handler exploded" }));
    updateMany.mockResolvedValueOnce({ count: 1 });
    const released = event({ errorMessage: null, createdAt: now });
    findUnique.mockResolvedValueOnce(released);

    await expect(acceptWebhookEvent(repo, data, now)).resolves.toEqual({
      outcome: "process",
      event: released,
    });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        provider: "stripe",
        eventId: "evt_1",
        processedAt: null,
        OR: [
          { errorMessage: { not: null } },
          { createdAt: { lt: new Date(now.getTime() - WEBHOOK_IN_FLIGHT_MS) } },
        ],
      },
      data: { createdAt: now, errorMessage: null },
    });
  });

  it("reports in_flight when a concurrent retrier wins the re-lease", async () => {
    create.mockRejectedValueOnce(conflict());
    findUnique.mockResolvedValueOnce(event({ errorMessage: "handler exploded" }));
    updateMany.mockResolvedValueOnce({ count: 0 });
    findUnique.mockResolvedValueOnce(event({ errorMessage: null, createdAt: new Date() }));

    await expect(acceptWebhookEvent(repo, data)).resolves.toEqual({
      outcome: "in_flight",
    });
  });

  it("reports skip_processed when the row was processed between the read and the re-lease", async () => {
    create.mockRejectedValueOnce(conflict());
    findUnique.mockResolvedValueOnce(event({ errorMessage: "handler exploded" }));
    updateMany.mockResolvedValueOnce({ count: 0 });
    findUnique.mockResolvedValueOnce(event({ processedAt: new Date() }));

    await expect(acceptWebhookEvent(repo, data)).resolves.toEqual({
      outcome: "skip_processed",
    });
  });

  it("skips only a processed duplicate", async () => {
    create.mockRejectedValueOnce(conflict());
    findUnique.mockResolvedValueOnce(event({ processedAt: new Date() }));

    await expect(acceptWebhookEvent(repo, data)).resolves.toEqual({
      outcome: "skip_processed",
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("replays a clock-driven invoice.paid after the first handler crashes", async () => {
    const crashed = event({
      eventType: "invoice.paid",
      processedAt: null,
      errorMessage: "clock advance handler crashed",
    });
    create.mockRejectedValueOnce(conflict());
    findUnique.mockResolvedValueOnce(crashed);
    updateMany.mockResolvedValueOnce({ count: 1 });
    const released = { ...crashed, errorMessage: null };
    findUnique.mockResolvedValueOnce(released);

    await expect(acceptWebhookEvent(repo, data)).resolves.toEqual({
      outcome: "process",
      event: released,
    });
  });

  it("asks the provider to retry while another worker is in-flight", async () => {
    create.mockRejectedValueOnce(conflict());
    findUnique.mockResolvedValueOnce(
      event({
        processedAt: null,
        errorMessage: null,
        createdAt: new Date(),
      }),
    );

    await expect(acceptWebhookEvent(repo, data)).resolves.toEqual({
      outcome: "in_flight",
    });
    // A held lease is never re-stamped by a duplicate delivery.
    expect(updateMany).not.toHaveBeenCalled();
  });
});
