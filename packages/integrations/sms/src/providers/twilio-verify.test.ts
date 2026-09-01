import { afterEach, describe, expect, it, vi } from "vitest";
import { createTwilioVerifyProvider } from "./twilio-verify";

describe("Twilio Verify provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails closed when credentials are incomplete", () => {
    expect(() =>
      createTwilioVerifyProvider({
        accountSid: "AC123",
        authToken: "",
        serviceSid: "VA123",
      }),
    ).toThrow(/Twilio Verify configuration missing: authToken/i);
  });

  it("starts an SMS verification without sending the Better Auth code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "pending" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = createTwilioVerifyProvider({
      accountSid: "AC123",
      authToken: "secret-token",
      serviceSid: "VA123",
    });

    await expect(provider.send("+14155552671", "654321")).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://verify.twilio.com/v2/Services/VA123/Verifications");
    expect(init.method).toBe("POST");
    expect(String(init.body)).toContain("To=%2B14155552671");
    expect(String(init.body)).toContain("Channel=sms");
    expect(String(init.body)).not.toContain("654321");
    expect(new Headers(init.headers).get("authorization")).toMatch(/^Basic /u);
  });

  it("approves only a successful verification check", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "approved" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "pending" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const provider = createTwilioVerifyProvider({
      accountSid: "AC123",
      authToken: "secret-token",
      serviceSid: "VA123",
    });

    await expect(provider.verify("+14155552671", "123456")).resolves.toBe(true);
    await expect(provider.verify("+14155552671", "000000")).resolves.toBe(false);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain("Code=123456");
  });

  it("fails closed when Twilio returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 60203, message: "Max send attempts reached" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const provider = createTwilioVerifyProvider({
      accountSid: "AC123",
      authToken: "secret-token",
      serviceSid: "VA123",
    });

    await expect(provider.send("+14155552671", "123456")).resolves.toBe(false);
    await expect(provider.verify("+14155552671", "123456")).resolves.toBe(false);
  });
});
