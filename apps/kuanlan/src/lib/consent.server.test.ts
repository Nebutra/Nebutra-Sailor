import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FACE_NOTICE_VERSION } from "./consent";

const KEY = "kuanlan/consent/user_1.json";

function streamOf(text: string): ReadableStream {
  return Readable.from([Buffer.from(text, "utf8")]) as unknown as ReadableStream;
}

import { Readable } from "node:stream";

describe("consent store", () => {
  const previous = { ...process.env };

  beforeEach(() => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "account";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
  });

  afterEach(() => {
    process.env = { ...previous };
  });

  it("treats an absent record as absent, not as an error", async () => {
    const { readFaceConsent } = await import("./consent.server");
    await expect(readFaceConsent("user_1", { get: async () => null })).resolves.toBeNull();
  });

  it("treats an unreadable record as absent so nobody is locked out by corruption", async () => {
    const { readFaceConsent } = await import("./consent.server");
    await expect(
      readFaceConsent("user_1", { get: async () => streamOf("{not json") }),
    ).resolves.toBeNull();
  });

  it("writes a record the platform's UserConsent could take unchanged", async () => {
    const written: Record<string, string> = {};
    const { grantFaceConsent } = await import("./consent.server");

    const record = await grantFaceConsent(
      "user_1",
      { consentContext: "shoot", ipAddress: "203.0.113.7", userAgent: "test" },
      {
        put: async (key, body) => {
          written[key] = body.toString("utf8");
        },
      },
    );

    expect(Object.keys(written)).toEqual([KEY]);
    expect(record).toMatchObject({
      documentVersion: FACE_NOTICE_VERSION,
      consentType: "EXPLICIT",
      consentGiven: true,
      consentContext: "shoot",
      ipAddress: "203.0.113.7",
    });
    expect(JSON.parse(written[KEY] ?? "{}")).toMatchObject({ consentGiven: true });
  });

  it("stamps a withdrawal instead of deleting the evidence", async () => {
    let stored = JSON.stringify({
      documentSlug: "kuanlan-face-processing",
      documentVersion: FACE_NOTICE_VERSION,
      consentType: "EXPLICIT",
      consentGiven: true,
      consentedAt: "2026-09-03T00:00:00.000Z",
      consentContext: "shoot",
    });

    const { withdrawFaceConsent } = await import("./consent.server");
    const record = await withdrawFaceConsent("user_1", {
      get: async () => streamOf(stored),
      put: async (_key, body) => {
        stored = body.toString("utf8");
      },
    });

    expect(record?.consentGiven).toBe(false);
    expect(record?.withdrawnAt).toBeTruthy();
    // The original grant is still there — a consent log that erases itself is
    // no longer evidence that consent was ever given.
    expect(record?.consentedAt).toBe("2026-09-03T00:00:00.000Z");
  });

  it("cannot be pointed at another person's record", async () => {
    const { readFaceConsent } = await import("./consent.server");
    await expect(readFaceConsent("../user_2", { get: async () => null })).rejects.toMatchObject({
      name: "InvalidResourceKeyError",
    });
  });

  it("fails closed when the store is unconfigured", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;

    const { readFaceConsent } = await import("./consent.server");
    await expect(readFaceConsent("user_1", { get: async () => null })).rejects.toMatchObject({
      name: "ResourceStoreUnavailableError",
    });
  });
});
