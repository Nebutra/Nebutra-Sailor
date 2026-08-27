import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebhooks } from "../factory";
import type { WebhookDeadLetterDelivery, WebhookDeadLetterStore } from "../types";
import { CustomProvider } from "./custom";

class DurableDeadLetterStore implements WebhookDeadLetterStore {
  private records = new Map<string, WebhookDeadLetterDelivery>();

  async upsert(record: WebhookDeadLetterDelivery): Promise<void> {
    this.records.set(`${record.messageId}:${record.endpointId}`, record);
  }

  async delete(messageId: string, endpointId: string): Promise<void> {
    this.records.delete(`${messageId}:${endpointId}`);
  }

  async list(messageId?: string): Promise<WebhookDeadLetterDelivery[]> {
    return Array.from(this.records.values()).filter(
      (record) => messageId === undefined || record.messageId === messageId,
    );
  }
}

async function waitForAttempts(
  provider: CustomProvider,
  messageId: string,
  expectedCount: number,
): Promise<void> {
  await vi.waitFor(async () => {
    await expect(provider.getDeliveryAttempts(messageId)).resolves.toHaveLength(expectedCount);
  });
}

describe("CustomProvider delivery reliability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records a dead-letter entry with retry metadata when delivery attempts are exhausted", async () => {
    const fetchMock = vi.fn(async () => new Response("receiver down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new CustomProvider({ maxRetries: 1 });
    const endpoint = await provider.createEndpoint("tenant_123", {
      url: "https://example.com/webhooks",
      tenantId: "tenant_123",
      eventTypes: ["invoice.failed"],
      active: true,
    });

    const messageId = await provider.sendEvent({
      eventType: "invoice.failed",
      payload: { invoiceId: "inv_123" },
      tenantId: "tenant_123",
    });

    await waitForAttempts(provider, messageId, 1);

    const deadLetters = await (
      provider as CustomProvider & {
        getDeadLetterDeliveries(messageId?: string): Promise<
          Array<{
            messageId: string;
            endpointId: string;
            tenantId: string;
            eventType: string;
            finalAttemptNumber: number;
            statusCode: number | null;
            response: string | null;
          }>
        >;
      }
    ).getDeadLetterDeliveries(messageId);

    expect(deadLetters).toEqual([
      expect.objectContaining({
        messageId,
        endpointId: endpoint.id,
        tenantId: "tenant_123",
        eventType: "invoice.failed",
        finalAttemptNumber: 1,
        statusCode: 503,
        response: "HTTP 503",
      }),
    ]);

    await provider.close();
  });

  it("uses an injected dead-letter store so exhausted deliveries can outlive provider memory", async () => {
    const fetchMock = vi.fn(async () => new Response("receiver still down", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const deadLetterStore = new DurableDeadLetterStore();
    const provider = new CustomProvider({ maxRetries: 1, deadLetterStore });
    const endpoint = await provider.createEndpoint("tenant_123", {
      url: "https://example.com/webhooks",
      tenantId: "tenant_123",
      eventTypes: ["invoice.failed"],
      active: true,
    });

    const messageId = await provider.sendEvent({
      eventType: "invoice.failed",
      payload: { invoiceId: "inv_456" },
      tenantId: "tenant_123",
    });

    await waitForAttempts(provider, messageId, 1);
    await provider.close();

    const restartedProvider = new CustomProvider({ maxRetries: 1, deadLetterStore });

    await expect(restartedProvider.getDeadLetterDeliveries(messageId)).resolves.toEqual([
      expect.objectContaining({
        messageId,
        endpointId: endpoint.id,
        tenantId: "tenant_123",
        eventType: "invoice.failed",
        finalAttemptNumber: 1,
        statusCode: 502,
      }),
    ]);

    await restartedProvider.close();
  });

  it("passes an injected dead-letter store through the custom provider factory config", async () => {
    const fetchMock = vi.fn(
      async () => new Response("receiver down through factory", { status: 503 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const deadLetterStore = new DurableDeadLetterStore();
    const provider = await createWebhooks({
      provider: "custom",
      maxRetries: 1,
      deadLetterStore,
    });
    const endpoint = await provider.createEndpoint("tenant_123", {
      url: "https://example.com/webhooks",
      tenantId: "tenant_123",
      eventTypes: ["invoice.failed"],
      active: true,
    });

    const messageId = await provider.sendEvent({
      eventType: "invoice.failed",
      payload: { invoiceId: "inv_factory" },
      tenantId: "tenant_123",
    });

    await waitForAttempts(provider as CustomProvider, messageId, 1);
    await provider.close();

    await expect(deadLetterStore.list(messageId)).resolves.toEqual([
      expect.objectContaining({
        messageId,
        endpointId: endpoint.id,
        tenantId: "tenant_123",
        eventType: "invoice.failed",
        finalAttemptNumber: 1,
        statusCode: 503,
      }),
    ]);
  });

  it("drains pending initial deliveries before close clears provider state", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new CustomProvider({ maxRetries: 1 });
    await provider.createEndpoint("tenant_123", {
      url: "https://example.com/webhooks",
      tenantId: "tenant_123",
      eventTypes: ["invoice.paid"],
      active: true,
    });

    await provider.sendEvent({
      eventType: "invoice.paid",
      payload: { invoiceId: "inv_close" },
      tenantId: "tenant_123",
    });
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });
    let closed = false;
    const closePromise = provider.close().then(() => {
      closed = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(closed).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    resolveFetch?.(new Response("accepted", { status: 200 }));
    await closePromise;
  });
});
