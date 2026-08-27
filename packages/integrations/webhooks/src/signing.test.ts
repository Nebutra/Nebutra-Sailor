import { describe, expect, it } from "vitest";
import {
  formatWebhookSignatureHeader,
  parseWebhookSignatureHeader,
  signPayload,
  verifyPayload,
} from "./signing";

describe("webhook signing", () => {
  const secret = Buffer.from("test-webhook-secret-32-bytes-min").toString("base64");
  const payload = JSON.stringify({ event: "user.created", id: "user_123" });

  it("signs and verifies a valid payload", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signPayload(payload, secret, timestamp);
    expect(verifyPayload(payload, signature, secret, timestamp)).toBe(true);
  });

  it("produces deterministic signatures for same inputs", () => {
    const timestamp = "1700000000";
    const sig1 = signPayload(payload, secret, timestamp);
    const sig2 = signPayload(payload, secret, timestamp);
    expect(sig1).toBe(sig2);
  });

  it("produces different signatures for different payloads", () => {
    const timestamp = "1700000000";
    const sig1 = signPayload(payload, secret, timestamp);
    const sig2 = signPayload('{"different":"payload"}', secret, timestamp);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different timestamps", () => {
    const sig1 = signPayload(payload, secret, "1700000000");
    const sig2 = signPayload(payload, secret, "1700000001");
    expect(sig1).not.toBe(sig2);
  });

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

  it("rejects completely wrong signatures", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    expect(() => verifyPayload(payload, "totally-wrong", secret, timestamp)).toThrow(
      "Signature verification failed",
    );
  });

  it("rejects expired timestamps (replay protection)", () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 min ago
    const signature = signPayload(payload, secret, oldTimestamp);
    expect(() => verifyPayload(payload, signature, secret, oldTimestamp)).toThrow(
      "Timestamp is too old",
    );
  });

  it("rejects future timestamps (clock skew)", () => {
    const futureTimestamp = (Math.floor(Date.now() / 1000) + 600).toString();
    const signature = signPayload(payload, secret, futureTimestamp);
    expect(() => verifyPayload(payload, signature, secret, futureTimestamp)).toThrow(
      "Timestamp is in the future",
    );
  });

  it("rejects invalid timestamp format", () => {
    const signature = signPayload(payload, secret, "not-a-number");
    expect(() => verifyPayload(payload, signature, secret, "not-a-number")).toThrow(
      "Invalid timestamp format",
    );
  });

  it("respects custom tolerance", () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const signature = signPayload(payload, secret, oldTimestamp);
    // Should pass with 1-hour tolerance
    expect(verifyPayload(payload, signature, secret, oldTimestamp, 3600)).toBe(true);
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

  it("parses header with multiple = in signature", () => {
    // Base64 signatures often end with = padding
    const header = "t=1700000000,v1=abc123def456==";
    const parsed = parseWebhookSignatureHeader(header);
    expect(parsed?.timestamp).toBe("1700000000");
    expect(parsed?.signature).toBe("abc123def456==");
  });

  it("returns null for malformed headers", () => {
    expect(parseWebhookSignatureHeader("invalid")).toBeNull();
    expect(parseWebhookSignatureHeader("t=123")).toBeNull();
    expect(parseWebhookSignatureHeader("v1=abc")).toBeNull();
  });
});
