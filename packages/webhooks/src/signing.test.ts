import { describe, expect, it } from "vitest";
import {
  formatWebhookSignatureHeader,
  parseWebhookSignatureHeader,
  signPayload,
  verifyPayload,
} from "./signing.js";

describe("webhook signing", () => {
  const secret = Buffer.from("test-webhook-secret-32-bytes-min").toString("base64");
  const payload = JSON.stringify({ event: "user.created", id: "user_123" });

  it("rejects forged signatures even when their encoded length matches", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const validSignature = signPayload(payload, secret, timestamp);
    const forgedSignature = `${validSignature.slice(0, -1)}${
      validSignature.endsWith("A") ? "B" : "A"
    }`;

    expect(forgedSignature).toHaveLength(validSignature.length);
    expect(() => verifyPayload(payload, forgedSignature, secret, timestamp)).toThrow(
      "Signature verification failed",
    );
  });

  it("formats delivery headers without embedding the endpoint secret", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signPayload(payload, secret, timestamp);
    const header = formatWebhookSignatureHeader(timestamp, signature);

    expect(header).not.toContain(secret);
    expect(parseWebhookSignatureHeader(header)).toEqual({
      timestamp,
      signature,
    });
  });
});
