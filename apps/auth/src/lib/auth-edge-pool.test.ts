import { describe, expect, it, vi } from "vitest";
import { attachPoolErrorGuard, isPgConnectFailure, withConnectRetry } from "./auth-edge-pool";

describe("isPgConnectFailure", () => {
  it("matches the Hyperdrive / pg connect timeout seen on auth-edge", () => {
    expect(isPgConnectFailure(new Error("timeout exceeded when trying to connect"))).toBe(true);
  });

  it("ignores Better Auth application errors", () => {
    expect(isPgConnectFailure(new Error("State mismatch: State not persisted correctly"))).toBe(
      false,
    );
  });
});

describe("attachPoolErrorGuard", () => {
  it("subscribes to pool error so the isolate does not throw 1101", () => {
    const onError = vi.fn();
    const listeners: Array<(err: Error) => void> = [];
    attachPoolErrorGuard(
      {
        on(event, listener) {
          expect(event).toBe("error");
          listeners.push(listener);
        },
      },
      onError,
    );

    const err = new Error("Connection terminated unexpectedly");
    listeners[0]?.(err);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describe("withConnectRetry", () => {
  it("resets and retries once after a connect timeout", async () => {
    const reset = vi.fn();
    let calls = 0;
    const result = await withConnectRetry(async () => {
      calls += 1;
      if (calls === 1) throw new Error("timeout exceeded when trying to connect");
      return "ok";
    }, reset);

    expect(result).toBe("ok");
    expect(reset).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
  });

  it("does not retry application errors", async () => {
    const reset = vi.fn();
    await expect(
      withConnectRetry(async () => {
        throw new Error("State not found in OAuth callback");
      }, reset),
    ).rejects.toThrow("State not found in OAuth callback");
    expect(reset).not.toHaveBeenCalled();
  });
});
