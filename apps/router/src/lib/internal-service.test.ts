import { describe, expect, it } from "vitest";

vi.mock("server-only", () => ({}));

import { vi } from "vitest";

const { signServiceToken } = await import("@nebutra/auth");
const { resolveNewApiModel, verifyInternalServiceCaller } = await import("./internal-service");

function requestWithToken(token?: string) {
  return new Request("https://router.internal/api/internal/v1/chat/completions", {
    headers: token ? { "x-service-token": token } : {},
  });
}

describe("verifyInternalServiceCaller", () => {
  it("accepts an empty-context service token signed with SERVICE_SECRET", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    const token = await signServiceToken({});
    expect(await verifyInternalServiceCaller(requestWithToken(token))).toBe(true);
  });

  it("rejects a request with no token", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    expect(await verifyInternalServiceCaller(requestWithToken())).toBe(false);
  });

  it("rejects a token signed with the wrong secret", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    const token = await signServiceToken({}, "another-secret");
    expect(await verifyInternalServiceCaller(requestWithToken(token))).toBe(false);
  });

  it("rejects a token carrying tenant context — this caller shape is always empty-context", async () => {
    process.env.SERVICE_SECRET = "test-secret";
    const token = await signServiceToken({ organizationId: "org_1" });
    expect(await verifyInternalServiceCaller(requestWithToken(token))).toBe(false);
  });
});

describe("resolveNewApiModel", () => {
  it("falls through to the wildcard row and returns the model unchanged when no specific alias is configured", () => {
    delete process.env.NEBUTRA_MODEL_ALIASES;
    expect(resolveNewApiModel("gpt-4o-mini")).toBe("gpt-4o-mini");
  });

  it("resolves a public alias to its mapped newapi upstream model", () => {
    process.env.NEBUTRA_MODEL_ALIASES = JSON.stringify([
      { publicModel: "gpt-5.6-luna", engineId: "newapi", upstreamModel: "gpt-4o", priority: 10 },
    ]);
    expect(resolveNewApiModel("gpt-5.6-luna")).toBe("gpt-4o");
  });

  it("ignores an alias row written for a different engine", () => {
    process.env.NEBUTRA_MODEL_ALIASES = JSON.stringify([
      {
        publicModel: "claude-sonnet-5",
        engineId: "sub2api",
        upstreamModel: "claude-3-7-sonnet",
        priority: 10,
      },
    ]);
    expect(resolveNewApiModel("claude-sonnet-5")).toBe("claude-sonnet-5");
  });
});
