import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomProvider } from "./custom.js";

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
});
