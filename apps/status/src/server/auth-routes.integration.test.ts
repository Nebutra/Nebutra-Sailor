/** The account and key routes, end to end on PGlite: setup → sign-in → key → push. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { POST as setup, GET as setupStatus } from "@/app/api/v1/auth/setup/route";
import { POST as signIn } from "@/app/api/v1/auth/sign-in/route";
import { POST as signOut } from "@/app/api/v1/auth/sign-out/route";
import { DELETE as revokeKey } from "@/app/api/v1/keys/[id]/route";
import { POST as createKey, GET as listKeys } from "@/app/api/v1/keys/route";
import { POST as postEvidence } from "@/app/api/v1/pages/[slug]/evidence/route";
import { applyConfig } from "./config";
import { setDbForTests } from "./db";
import { createTestDb, type TestDb } from "./testing";

let t: TestDb;
const BASE = "https://status.acme.test";

function req(
  path: string,
  init: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string> } = {},
) {
  const headers = new Headers(init.headers);
  if (init.cookie) {
    headers.set("cookie", init.cookie);
    headers.set("host", "status.acme.test");
    if ((init.method ?? "GET") !== "GET" && !headers.has("origin")) headers.set("origin", BASE);
  }
  if (init.body !== undefined) headers.set("content-type", "application/json");
  return new Request(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
}
const cookieOf = (res: Response) => (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

beforeAll(async () => {
  t = await createTestDb();
  setDbForTests(t.db);
}, 60_000);
afterAll(async () => {
  setDbForTests(null);
  await t.close();
});
beforeEach(async () => {
  await t.db.workspace.deleteMany();
  process.env.STATUS_SETUP_TOKEN = "setup-secret";
});
afterEach(() => {
  delete process.env.STATUS_SETUP_TOKEN;
});

const owner = {
  setupToken: "setup-secret",
  email: "owner@acme.test",
  password: "a long enough password",
  workspaceSlug: "acme",
};

describe("auth and key routes", () => {
  it("runs the first-run flow and pushes evidence with the minted key", async () => {
    await applyConfig(t.db, {
      workspace: { slug: "acme", name: "Acme" },
      page: { slug: "acme", title: "Acme" },
      components: [{ key: "api", name: "API" }],
    });
    expect(await (await setupStatus()).json()).toEqual({ available: true });

    expect(
      (await setup(req("/s", { method: "POST", body: { ...owner, setupToken: "x" } }))).status,
    ).toBe(403);
    const created = await setup(req("/s", { method: "POST", body: owner }));
    expect(created.status).toBe(201);
    expect(created.headers.get("set-cookie")).toMatch(
      /^ns_session=.+; Path=\/; HttpOnly; Secure; SameSite=Lax/,
    );
    expect((await setup(req("/s", { method: "POST", body: owner }))).status).toBe(409);

    expect(
      (await signIn(req("/i", { method: "POST", body: { email: owner.email, password: "nope" } })))
        .status,
    ).toBe(401);
    const signedIn = await signIn(
      req("/i", { method: "POST", body: { email: owner.email, password: owner.password } }),
    );
    expect(signedIn.status).toBe(200);
    const cookie = cookieOf(signedIn);
    expect((await (await me(req("/me", { cookie }))).json()).member.role).toBe("owner");

    const minted = await createKey(
      req("/k", { method: "POST", cookie, body: { name: "probes", scopes: ["evidence:write"] } }),
    );
    expect(minted.status).toBe(201);
    const { key, apiKey } = await minted.json();
    expect(key).toMatch(/^ns_/);

    const push = await postEvidence(
      new Request(`${BASE}/e`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          component: "api",
          source: "probe",
          coverage: "synthetic",
          state: "operational",
          freshnessSeconds: 300,
        }),
      }),
      { params: Promise.resolve({ slug: "acme" }) },
    );
    expect(push.status).toBe(202);

    const listed = await (await listKeys(req("/k", { cookie }))).json();
    expect(listed.keys[0]).toMatchObject({ name: "probes", prefix: key.slice(0, 10) });
    expect(listed.keys[0].lastUsedAt).toMatch(/Z$/);
    expect(JSON.stringify(listed)).not.toContain(key);

    const cross = await revokeKey(
      req(`/k/${apiKey.id}`, {
        method: "DELETE",
        cookie,
        headers: { origin: "https://evil.test", host: "status.acme.test" },
      }),
      { params: Promise.resolve({ id: apiKey.id }) },
    );
    expect(cross.status).toBe(403);
    // A cookie write with no Origin at all is refused too.
    const bare = new Request(`${BASE}/k/${apiKey.id}`, { method: "DELETE", headers: { cookie } });
    expect((await revokeKey(bare, { params: Promise.resolve({ id: apiKey.id }) })).status).toBe(
      403,
    );
    const revoked = await revokeKey(req(`/k/${apiKey.id}`, { method: "DELETE", cookie }), {
      params: Promise.resolve({ id: apiKey.id }),
    });
    expect(revoked.status).toBe(200);

    const out = await signOut(req("/o", { method: "POST", cookie }));
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect((await me(req("/me", { cookie }))).status).toBe(401);
  });

  it("refuses key management to editors and anonymous callers", async () => {
    const created = await setup(req("/s", { method: "POST", body: owner }));
    const ownerCookie = cookieOf(created);
    expect((await listKeys(req("/k"))).status).toBe(401);
    const ws = await t.db.workspace.findUniqueOrThrow({ where: { slug: "acme" } });
    await t.db.member.create({
      data: {
        workspaceId: ws.id,
        email: "ed@acme.test",
        role: "editor",
        passwordHash: (await t.db.member.findFirstOrThrow()).passwordHash,
      },
    });
    const editor = await signIn(
      req("/i", { method: "POST", body: { email: "ed@acme.test", password: owner.password } }),
    );
    expect((await listKeys(req("/k", { cookie: cookieOf(editor) }))).status).toBe(403);
    expect((await listKeys(req("/k", { cookie: ownerCookie }))).status).toBe(200);
  });

  it("is closed without STATUS_SETUP_TOKEN", async () => {
    delete process.env.STATUS_SETUP_TOKEN;
    expect(await (await setupStatus()).json()).toEqual({ available: false });
    expect((await setup(req("/s", { method: "POST", body: owner }))).status).toBe(409);
  });
});
