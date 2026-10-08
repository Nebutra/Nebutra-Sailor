import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { organization } from "better-auth/plugins";
import { expect, it } from "vitest";
import { EDGE_ORGANIZATION_OPTIONS } from "../../../../packages/iam/auth/src/providers/better-auth/edge-organization-config";

it("only lists memberships and rejects activation of another organization's workspace", async () => {
  const data: Record<string, Record<string, unknown>[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
    "better_auth.organization": [],
    "better_auth.member": [],
    "better_auth.invitation": [],
  };
  const auth = betterAuth({
    baseURL: "https://auth.nebutra.com",
    secret: "regression-test-secret-not-a-production-credential",
    database: memoryAdapter(data),
    emailAndPassword: { enabled: true },
    trustedOrigins: ["https://kcq.nebutra.com"],
    plugins: [organization(EDGE_ORGANIZATION_OPTIONS)],
  });
  const signup = await auth.api.signUpEmail({
    body: {
      name: "Workspace member",
      email: "member@example.test",
      password: "regression-password",
    },
    returnHeaders: true,
  });
  const cookie = signup.headers
    .getSetCookie()
    .map((s) => s.split(";")[0])
    .join("; ");
  const headers = new Headers({
    cookie,
    origin: "https://kcq.nebutra.com",
    "content-type": "application/json",
  });
  const now = new Date();
  data["better_auth.organization"].push(
    { id: "allowed", name: "Allowed", slug: "allowed", created_at: now },
    { id: "foreign", name: "Foreign", slug: "foreign", created_at: now },
  );
  data["better_auth.member"].push({
    id: "membership",
    user_id: signup.response.user.id,
    organization_id: "allowed",
    role: "member",
    created_at: now,
  });
  const list = await auth.handler(
    new Request("https://auth.nebutra.com/api/auth/organization/list", { headers }),
  );
  expect(list.status).toBe(200);
  expect(await list.json()).toMatchObject([{ id: "allowed" }]);
  const activate = (id: string) =>
    auth.handler(
      new Request("https://auth.nebutra.com/api/auth/organization/set-active", {
        method: "POST",
        headers,
        body: JSON.stringify({ organizationId: id }),
      }),
    );
  expect((await activate("foreign")).status).toBe(403);
  expect((await activate("allowed")).status).toBe(200);
  const unauthenticated = await auth.handler(
    new Request("https://auth.nebutra.com/api/auth/organization/list"),
  );
  expect(unauthenticated.status).toBe(401);
});
