import { describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { fromJwtClaim } = await import("./resolvers");

function jwtWithPayload(payload: Record<string, unknown>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encodedPayload}.signature`;
}

describe("fromJwtClaim", () => {
  it("extracts bearer tokens from the Authorization header", async () => {
    const resolver = fromJwtClaim("tenant_id");
    const token = jwtWithPayload({ tenant_id: "org_from_bearer" });

    await expect(
      Promise.resolve(resolver({ headers: { Authorization: `Bearer ${token}` } })),
    ).resolves.toBe("org_from_bearer");
  });

  it("decodes base64url JWT payloads", async () => {
    const resolver = fromJwtClaim("tenant_id");
    const token = jwtWithPayload({ tenant_id: "org_base64url-_" });

    await expect(Promise.resolve(resolver({ token }))).resolves.toBe("org_base64url-_");
  });
});
