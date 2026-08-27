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

  let create: ReturnType<typeof vi.fn>;
  let findUnique: ReturnType<typeof vi.fn>;
  let repo: WebhookEventRepository;

  beforeEach(() => {
    create = vi.fn();
    findUnique = vi.fn();
    repo = new WebhookEventRepository({
      webhookEvent: { create, findUnique },
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
    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    findUnique.mockResolvedValueOnce(
      event({ processedAt: null, errorMessage: "previous worker died" }),
    );

    await expect(acceptWebhookEvent(repo, data)).resolves.toMatchObject({
      outcome: "process",
    });
  });

  it("skips only a processed duplicate", async () => {
    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    findUnique.mockResolvedValueOnce(event({ processedAt: new Date() }));

    await expect(acceptWebhookEvent(repo, data)).resolves.toEqual({
      outcome: "skip_processed",
    });
  });

  it("replays a clock-driven invoice.paid after the first handler crashes", async () => {
    const crashed = event({
      eventType: "invoice.paid",
      processedAt: null,
      errorMessage: "clock advance handler crashed",
    });
    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    findUnique.mockResolvedValueOnce(crashed);

    await expect(acceptWebhookEvent(repo, data)).resolves.toEqual({
      outcome: "process",
      event: crashed,
    });
  });

  it("asks the provider to retry while another worker is in-flight", async () => {
    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
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
  });
});
