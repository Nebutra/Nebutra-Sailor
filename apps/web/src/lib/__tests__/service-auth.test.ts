/**
 * The headers built here are only useful if the gateway accepts them, so the
 * tests verify against the gateway's own verifier rather than against a
 * restatement of the rules. `getAuthenticatedApi` previously sent
 * `session?.userId ? undefined : undefined` — a signed-in user's request went
 * out anonymous and every downstream 401 looked like an expired session.
 */

import { signServiceToken, verifyServiceToken } from "@nebutra/auth";
import { beforeAll, describe, expect, it } from "vitest";
import { buildServiceAuthHeaders, SERVICE_TOKEN_HEADER } from "../service-auth";

const SECRET = "test-service-secret-for-round-trip";

const sign = (context: Parameters<typeof signServiceToken>[0]) =>
  signServiceToken(context, { secret: SECRET });

/** Exactly the call the gateway middleware makes on the headers it received. */
function gatewayAccepts(headers: Record<string, string>) {
  return verifyServiceToken(
    headers[SERVICE_TOKEN_HEADER],
    headers["x-user-id"],
    headers["x-organization-id"],
    headers["x-role"],
    headers["x-plan"],
    { secret: SECRET },
  );
}

beforeAll(() => {
  process.env.SERVICE_SECRET ??= SECRET;
});

describe("buildServiceAuthHeaders", () => {
  it("produces headers the gateway verifier accepts", async () => {
    const headers = await buildServiceAuthHeaders(
      {
        userId: "user_123",
        organizationId: "org_456",
        role: "org:admin",
        plan: "PRO",
      },
      sign,
    );

    expect(headers["x-user-id"]).toBe("user_123");
    expect(headers["x-organization-id"]).toBe("org_456");
    expect(headers["x-role"]).toBe("org:admin");
    expect(headers["x-plan"]).toBe("PRO");
    await expect(gatewayAccepts(headers)).resolves.toBe(true);
  });

  it("accepts a user with no organization — individual tenants have none", async () => {
    const headers = await buildServiceAuthHeaders({ userId: "user_123" }, sign);

    expect(headers["x-organization-id"]).toBeUndefined();
    await expect(gatewayAccepts(headers)).resolves.toBe(true);
  });

  it("sends nothing for an anonymous principal", async () => {
    expect(await buildServiceAuthHeaders({ userId: null }, sign)).toEqual({});
    expect(await buildServiceAuthHeaders({}, sign)).toEqual({});
  });

  it("treats an empty-string claim as absent rather than signing an empty value", async () => {
    const headers = await buildServiceAuthHeaders(
      { userId: "user_123", organizationId: "", role: "" },
      sign,
    );

    expect(headers["x-organization-id"]).toBeUndefined();
    expect(headers["x-role"]).toBeUndefined();
    await expect(gatewayAccepts(headers)).resolves.toBe(true);
  });

  it("is rejected when a header is altered after signing", async () => {
    const headers = await buildServiceAuthHeaders(
      { userId: "user_123", organizationId: "org_456" },
      sign,
    );

    await expect(
      gatewayAccepts({ ...headers, "x-organization-id": "org_someone_else" }),
    ).resolves.toBe(false);
  });

  it("refuses to sign without a configured secret", async () => {
    await expect(
      buildServiceAuthHeaders({ userId: "user_123" }, (context) =>
        signServiceToken(context, { secret: "" }),
      ),
    ).rejects.toThrow(/SERVICE_SECRET/);
  });
});
