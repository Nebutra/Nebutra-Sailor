import { describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { fromAuthSession } = await import("../../resolvers/from-auth-session");
const { fromHeader, compose } = await import("../../resolvers");

describe("fromAuthSession resolver", () => {
  it("returns organizationId when session has one", async () => {
    const getSession = vi.fn().mockResolvedValue({ organizationId: "org_123" });
    const resolver = fromAuthSession(getSession);

    const result = await Promise.resolve(resolver({ headers: {} }));

    expect(result).toBe("org_123");
    expect(getSession).toHaveBeenCalledOnce();
  });

  it("returns null when session is null", async () => {
    const getSession = vi.fn().mockResolvedValue(null);
    const resolver = fromAuthSession(getSession);

    const result = await Promise.resolve(resolver({ headers: {} }));

    expect(result).toBeNull();
  });

  it("returns null when session has no organizationId", async () => {
    const getSession = vi.fn().mockResolvedValue({});
    const resolver = fromAuthSession(getSession);

    const result = await Promise.resolve(resolver({ headers: {} }));

    expect(result).toBeNull();
  });

  it("propagates errors from the session getter (does not silently swallow)", async () => {
    const boom = new Error("session lookup failed");
    const getSession = vi.fn().mockRejectedValue(boom);
    const resolver = fromAuthSession(getSession);

    await expect(Promise.resolve(resolver({ headers: {} }))).rejects.toThrow(
      "session lookup failed",
    );
  });

  it("supports synchronous session getters", async () => {
    const getSession = vi.fn().mockReturnValue({ organizationId: "org_sync" });
    const resolver = fromAuthSession(getSession);

    const result = await Promise.resolve(resolver({ headers: {} }));

    expect(result).toBe("org_sync");
  });

  it("composes correctly with fromHeader — header wins when present", async () => {
    const getSession = vi.fn().mockResolvedValue({ organizationId: "org_from_session" });
    const resolver = compose(fromHeader("x-tenant-id"), fromAuthSession(getSession));

    const result = await Promise.resolve(
      resolver({ headers: { "x-tenant-id": "org_from_header" } }),
    );

    expect(result).toBe("org_from_header");
    // compose short-circuits — session getter should not be called when header matches
    expect(getSession).not.toHaveBeenCalled();
  });

  it("composes correctly with fromHeader — session wins when no header", async () => {
    const getSession = vi.fn().mockResolvedValue({ organizationId: "org_from_session" });
    const resolver = compose(fromHeader("x-tenant-id"), fromAuthSession(getSession));

    const result = await Promise.resolve(resolver({ headers: {} }));

    expect(result).toBe("org_from_session");
    expect(getSession).toHaveBeenCalledOnce();
  });
});
