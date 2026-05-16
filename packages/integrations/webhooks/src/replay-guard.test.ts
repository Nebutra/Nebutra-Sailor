import { describe, expect, it } from "vitest";
import {
  createReplayGuard,
  formatWebhookSignatureHeader,
  InMemoryWebhookReplayStore,
  signPayload,
} from "./signing";

describe("webhook replay guard", () => {
  const secret = Buffer.from("test-webhook-secret-32-bytes-min").toString("base64");
  const payload = JSON.stringify({ event: "invoice.paid", id: "evt_123" });

  it("accepts a valid delivery once and rejects duplicate message ids", async () => {
    const replayGuard = createReplayGuard({ store: new InMemoryWebhookReplayStore() });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = formatWebhookSignatureHeader(
      timestamp,
      signPayload(payload, secret, timestamp),
    );

    await expect(
      replayGuard.verifyOnce({
        payload,
        signature,
        secret,
        messageId: "msg_once",
      }),
    ).resolves.toBe(true);

    await expect(
      replayGuard.verifyOnce({
        payload,
        signature,
        secret,
        messageId: "msg_once",
      }),
    ).rejects.toThrow("Webhook replay detected");
  });

  it("does not mark a message id as consumed when signature verification fails", async () => {
    const replayGuard = createReplayGuard({ store: new InMemoryWebhookReplayStore() });

    await expect(
      replayGuard.verifyOnce({
        payload,
        signature: "t=1700000000,v1=invalid",
        secret,
        messageId: "msg_invalid",
      }),
    ).rejects.toThrow("Timestamp is too old");

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = formatWebhookSignatureHeader(
      timestamp,
      signPayload(payload, secret, timestamp),
    );

    await expect(
      replayGuard.verifyOnce({
        payload,
        signature,
        secret,
        messageId: "msg_invalid",
      }),
    ).resolves.toBe(true);
  });
});
