import { afterEach, describe, expect, it } from "vitest";
import { type MockAuthServer, startMockAuthServer } from "../../tests/device-auth-mock-server";
import {
  fetchWhoami,
  isTransientPollFailure,
  pollUntilComplete,
  requestDeviceCode,
  resolveAuthBaseUrl,
} from "./device-auth";

describe("device-auth", () => {
  let server: MockAuthServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
    delete process.env.NEBUTRA_AUTH_URL;
  });

  it("resolveAuthBaseUrl honours NEBUTRA_AUTH_URL", () => {
    process.env.NEBUTRA_AUTH_URL = "https://auth.example.internal/";
    expect(resolveAuthBaseUrl()).toBe("https://auth.example.internal");
  });

  it("requestDeviceCode returns the RFC 8628 fields", async () => {
    server = await startMockAuthServer();
    const device = await requestDeviceCode(server.url);
    expect(device.device_code).toBeTruthy();
    expect(device.user_code).toBeTruthy();
    expect(device.verification_uri_complete).toContain(device.user_code);
  });

  it("pollUntilComplete resolves once the mock server approves", async () => {
    server = await startMockAuthServer({ pendingPolls: 2, intervalSeconds: 0 });
    const device = await requestDeviceCode(server.url);

    const waits: number[] = [];
    const token = await pollUntilComplete(server.url, device.device_code, {
      intervalSeconds: 0,
      deadline: Date.now() + 5000,
      sleep: async () => {}, // no real waiting in tests
      onWaiting: (interval) => waits.push(interval),
    });

    expect(token.access_token).toBeTruthy();
    expect(token.token_type).toBe("Bearer");
    // pending, pending, approved — 3 attempts, 3 waits logged.
    expect(waits.length).toBe(3);
  });

  it("pollUntilComplete backs off on slow_down", async () => {
    server = await startMockAuthServer({ pendingPolls: 3, slowDownOnPoll: 2, intervalSeconds: 1 });
    const device = await requestDeviceCode(server.url);

    const waits: number[] = [];
    await pollUntilComplete(server.url, device.device_code, {
      intervalSeconds: 1,
      deadline: Date.now() + 5000,
      sleep: async () => {},
      onWaiting: (interval) => waits.push(interval),
    });

    // interval starts at 1s; after the slow_down response it should jump by 5.
    expect(waits).toContain(6);
  });

  it("pollUntilComplete throws access_denied when the mock server denies", async () => {
    server = await startMockAuthServer({ pendingPolls: 0, denyAfterPending: true });
    const device = await requestDeviceCode(server.url);

    await expect(
      pollUntilComplete(server.url, device.device_code, {
        intervalSeconds: 0,
        deadline: Date.now() + 5000,
        sleep: async () => {},
      }),
    ).rejects.toMatchObject({ code: "access_denied" });
  });

  it("pollUntilComplete throws expired_token once the deadline passes", async () => {
    server = await startMockAuthServer({ pendingPolls: 999 });
    const device = await requestDeviceCode(server.url);

    await expect(
      pollUntilComplete(server.url, device.device_code, {
        intervalSeconds: 0,
        deadline: Date.now() - 1, // already past
        sleep: async () => {},
      }),
    ).rejects.toMatchObject({ code: "expired_token" });
  });

  it("fetchWhoami resolves the identity for a valid bearer token", async () => {
    server = await startMockAuthServer({ pendingPolls: 0, email: "whoami@example.com" });
    const device = await requestDeviceCode(server.url);
    const token = await pollUntilComplete(server.url, device.device_code, {
      intervalSeconds: 0,
      deadline: Date.now() + 5000,
      sleep: async () => {},
    });

    const identity = await fetchWhoami(server.url, token.access_token);
    expect(identity?.email).toBe("whoami@example.com");
  });

  it("fetchWhoami returns null for an invalid token", async () => {
    server = await startMockAuthServer();
    const identity = await fetchWhoami(server.url, "not-a-real-token");
    expect(identity).toBeNull();
  });

  describe("transient poll failures (RFC 8628 §3.5)", () => {
    const token = { access_token: "tok", token_type: "Bearer" };
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    const timeout = () =>
      Object.assign(new Error("The operation was aborted due to timeout"), {
        name: "TimeoutError",
      });

    it("keeps polling past a timeout, a dropped connection and a 5xx, then resolves", async () => {
      const answers: Array<() => Response> = [
        () => {
          throw timeout();
        },
        () => {
          throw new TypeError("fetch failed");
        },
        () => json(503, {}),
        () => json(400, { error: "authorization_pending" }),
        () => json(200, token),
      ];
      const fetchImpl = (async () => answers.shift()!()) as unknown as typeof fetch;
      const transient: unknown[] = [];

      const result = await pollUntilComplete("https://auth.example", "dc", {
        intervalSeconds: 5,
        deadline: Date.now() + 60_000,
        fetchImpl,
        sleep: async () => {},
        onTransientFailure: (e) => transient.push(e),
      });

      expect(result.access_token).toBe("tok");
      expect(transient).toHaveLength(3);
    });

    it("still ends on the server's answer", async () => {
      const fetchImpl = (async () =>
        json(400, { error: "access_denied" })) as unknown as typeof fetch;
      await expect(
        pollUntilComplete("https://auth.example", "dc", {
          intervalSeconds: 5,
          deadline: Date.now() + 60_000,
          fetchImpl,
          sleep: async () => {},
        }),
      ).rejects.toMatchObject({ code: "access_denied" });
    });

    it("gives up at the deadline even while every poll times out", async () => {
      let now = 0;
      const fetchImpl = (async () => {
        throw timeout();
      }) as unknown as typeof fetch;
      const realNow = Date.now;
      Date.now = () => now;
      try {
        await expect(
          pollUntilComplete("https://auth.example", "dc", {
            intervalSeconds: 5,
            deadline: 100_000,
            fetchImpl,
            sleep: async (ms) => {
              now += ms;
            },
          }),
        ).rejects.toMatchObject({ code: "expired_token" });
      } finally {
        Date.now = realNow;
      }
    });

    it("classifies failures without an answer as transient, answers as not", () => {
      expect(isTransientPollFailure(timeout())).toBe(true);
      expect(isTransientPollFailure(new TypeError("fetch failed"))).toBe(true);
      expect(isTransientPollFailure(new Error("boom"))).toBe(false);
    });
  });
});
