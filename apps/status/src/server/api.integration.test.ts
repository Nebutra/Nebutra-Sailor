/**
 * Route handlers end to end on PGlite: auth, evidence push, incidents, the
 * deploy gate, feeds and health.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as healthz } from "@/app/api/healthz/route";
import { GET as readyz } from "@/app/api/readyz/route";
import { POST as postEvidence } from "@/app/api/v1/pages/[slug]/evidence/route";
import { GET as atom } from "@/app/api/v1/pages/[slug]/feed.atom/route";
import { GET as rss } from "@/app/api/v1/pages/[slug]/feed.rss/route";
import { GET as gate } from "@/app/api/v1/pages/[slug]/gate/route";
import { PATCH as patchIncident } from "@/app/api/v1/pages/[slug]/incidents/[id]/route";
import {
  GET as listIncidents,
  POST as postIncident,
} from "@/app/api/v1/pages/[slug]/incidents/route";
import { GET as status } from "@/app/api/v1/pages/[slug]/status/route";
import { createApiKey, SESSION_COOKIE, setupOwner } from "./auth";
import { applyConfig, type StatusConfig } from "./config";
import { setDbForTests } from "./db";
import { createTestDb, type TestDb } from "./testing";

const config: StatusConfig = {
  workspace: { slug: "acme", name: "Acme" },
  page: { slug: "acme", title: "Acme Status", description: "Acme & friends" },
  groups: [{ key: "product", name: "Product" }],
  components: [
    { key: "sign-in", name: "Sign-in", group: "product" },
    { key: "api", name: "API", group: "product" },
    { key: "database", name: "Database", public: false },
  ],
};

let t: TestDb;
let keys: { evidence: string; incidents: string; read: string };
let workspaceId: string;

const BASE = "https://status.acme.test";
const params = <P extends Record<string, string>>(p: P) => ({ params: Promise.resolve(p) });
const slug = params({ slug: "acme" });

function req(path: string, init: RequestInit & { key?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.key) headers.set("authorization", `Bearer ${init.key}`);
  if (init.body) headers.set("content-type", "application/json");
  return new Request(`${BASE}${path}`, { ...init, headers });
}

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
  const { page } = await applyConfig(t.db, config);
  workspaceId = page.workspaceId;
  keys = {
    evidence: (await createApiKey(t.db, workspaceId, "probe", ["evidence:write"])).key,
    incidents: (await createApiKey(t.db, workspaceId, "ops", ["incidents:write"])).key,
    read: (await createApiKey(t.db, workspaceId, "ci", ["status:read"])).key,
  };
});
afterEach(() => {
  delete process.env.STATUS_PUBLIC_URL;
});

const reading = (component: string, extra: Record<string, unknown> = {}) => ({
  component,
  source: "journey",
  coverage: "synthetic",
  state: "operational",
  latencyMs: 120,
  freshnessSeconds: 300,
  ...extra,
});

describe("GET status", () => {
  it("serves public components only, ISO dates, cacheable", async () => {
    const res = await status(req("/api/v1/pages/acme/status"), slug);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=15, stale-while-revalidate=60");
    const body = await res.json();
    expect(body).toMatchObject({
      version: 1,
      page: { slug: "acme", title: "Acme Status", url: `${BASE}/p/acme` },
      overall: "degraded",
      groups: [{ key: "product", components: ["sign-in", "api"] }],
    });
    expect(body.components.map((c: { key: string }) => c.key)).toEqual(["sign-in", "api"]);
    expect(body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(body.components[0].days).toHaveLength(90);
  });

  it("404s an unknown page", async () => {
    const res = await status(req("/api/v1/pages/nope/status"), params({ slug: "nope" }));
    expect(res.status).toBe(404);
  });
});

describe("POST evidence", () => {
  it("needs an evidence:write key of the page's workspace", async () => {
    const body = JSON.stringify(reading("sign-in"));
    expect((await postEvidence(req("/e", { method: "POST", body }), slug)).status).toBe(401);
    expect(
      (await postEvidence(req("/e", { method: "POST", body, key: keys.read }), slug)).status,
    ).toBe(401);

    const other = await t.db.workspace.create({ data: { slug: "other", name: "Other" } });
    const foreign = (await createApiKey(t.db, other.id, "x", ["evidence:write"])).key;
    expect(
      (await postEvidence(req("/e", { method: "POST", body, key: foreign }), slug)).status,
    ).toBe(403);
  });

  it("accepts one reading and a batch; reports unknown components per reading", async () => {
    const one = await postEvidence(
      req("/e", { method: "POST", body: JSON.stringify(reading("sign-in")), key: keys.evidence }),
      slug,
    );
    expect(one.status).toBe(202);
    expect(await one.json()).toMatchObject({
      accepted: 1,
      results: [{ changed: true, to: "operational" }],
    });

    const batch = await postEvidence(
      req("/e", {
        method: "POST",
        key: keys.evidence,
        body: JSON.stringify({ readings: [reading("api"), reading("database"), reading("ghost")] }),
      }),
      slug,
    );
    expect(batch.status).toBe(207);
    const body = await batch.json();
    expect(body).toMatchObject({ accepted: 2, rejected: 1 });
    expect(body.results[2]).toEqual({
      index: 2,
      component: "ghost",
      status: 404,
      error: "unknown_component",
    });
  });

  it("422s invalid readings and oversized batches", async () => {
    const bad = await postEvidence(
      req("/e", {
        method: "POST",
        key: keys.evidence,
        body: JSON.stringify({ readings: [reading("api"), reading("api", { state: "green" })] }),
      }),
      slug,
    );
    expect(bad.status).toBe(422);
    expect((await bad.json()).detail.readings[0].index).toBe(1);

    const tooMany = await postEvidence(
      req("/e", {
        method: "POST",
        key: keys.evidence,
        body: JSON.stringify({ readings: Array.from({ length: 101 }, () => reading("api")) }),
      }),
      slug,
    );
    expect(tooMany.status).toBe(422);
    expect(await t.db.evidence.count()).toBe(0);
  });
});

describe("incidents", () => {
  it("creates, lists and updates with an incidents:write key", async () => {
    const created = await postIncident(
      req("/i", {
        method: "POST",
        key: keys.incidents,
        body: JSON.stringify({
          title: "Login errors",
          impact: "major",
          message: "We are looking into it.",
          components: ["sign-in"],
        }),
      }),
      slug,
    );
    expect(created.status).toBe(201);
    const { incident } = await created.json();
    expect(incident).toMatchObject({ status: "investigating", components: ["sign-in"] });

    const patched = await patchIncident(
      req(`/i/${incident.id}`, {
        method: "PATCH",
        key: keys.incidents,
        body: JSON.stringify({ status: "resolved", message: "Fixed." }),
      }),
      params({ slug: "acme", id: incident.id }),
    );
    expect(patched.status).toBe(200);
    expect((await patched.json()).incident.updates).toHaveLength(2);

    const listed = await listIncidents(req("/i", { key: keys.read }), slug);
    expect((await listed.json()).incidents[0]).toMatchObject({ status: "resolved" });

    const missing = await patchIncident(
      req("/i/x", {
        method: "PATCH",
        key: keys.incidents,
        body: JSON.stringify({ status: "resolved" }),
      }),
      params({ slug: "acme", id: "nope" }),
    );
    expect(missing.status).toBe(404);
  });

  it("422s invalid input and unknown components", async () => {
    const res = await postIncident(
      req("/i", {
        method: "POST",
        key: keys.incidents,
        body: JSON.stringify({ title: "x", message: "y", components: ["ghost"] }),
      }),
      slug,
    );
    expect(res.status).toBe(422);
    const empty = await postIncident(
      req("/i", { method: "POST", key: keys.incidents, body: JSON.stringify({ title: "" }) }),
      slug,
    );
    expect(empty.status).toBe(422);
  });

  it("accepts a same-origin session of an editor, refuses cross-origin", async () => {
    await t.db.member.deleteMany();
    const env = { STATUS_SETUP_TOKEN: "s" } as unknown as NodeJS.ProcessEnv;
    const { token } = await setupOwner(
      t.db,
      {
        setupToken: "s",
        email: "o@acme.test",
        password: "long enough password",
        workspaceSlug: "acme",
      },
      { env },
    );
    const body = JSON.stringify({ title: "Slow API", message: "Looking." });
    const cookie = `${SESSION_COOKIE}=${token}`;
    const ok = await postIncident(
      req("/i", {
        method: "POST",
        body,
        headers: { cookie, origin: BASE, host: "status.acme.test" },
      }),
      slug,
    );
    expect(ok.status).toBe(201);
    const cross = await postIncident(
      req("/i", {
        method: "POST",
        body,
        headers: { cookie, origin: "https://evil.test", host: "status.acme.test" },
      }),
      slug,
    );
    expect(cross.status).toBe(403);
    const anonymous = await postIncident(req("/i", { method: "POST", body }), slug);
    expect(anonymous.status).toBe(401);
  });
});

describe("GET gate", () => {
  const push = (component: string, extra: Record<string, unknown> = {}) =>
    postEvidence(
      req("/e", {
        method: "POST",
        key: keys.evidence,
        body: JSON.stringify(reading(component, extra)),
      }),
      slug,
    );

  it("passes only on fresh synthetic evidence after since", async () => {
    const since = new Date(Date.now() - 60_000).toISOString();
    const url = (q: string) => req(`/api/v1/pages/acme/gate?${q}`);

    let res = await gate(url(`components=sign-in,api&since=${since}`), slug);
    expect(res.status).toBe(412);
    expect((await res.json()).components).toEqual([
      { key: "sign-in", verified: false, checkedAt: null, reason: "no_evidence" },
      { key: "api", verified: false, checkedAt: null, reason: "no_evidence" },
    ]);

    await push("sign-in");
    await push("api", { checkedAt: new Date(Date.now() - 120_000).toISOString() });
    res = await gate(url(`components=sign-in,api&since=${since}`), slug);
    expect(res.status).toBe(412);
    expect((await res.json()).components[1].reason).toBe("before_since");

    await push("api");
    res = await gate(url(`components=sign-in,api&since=${since}`), slug);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ pass: true, coverage: "synthetic" });

    await push("api", { state: "outage" });
    res = await gate(url(`components=sign-in,api&since=${since}`), slug);
    expect((await res.json()).components[1].reason).toBe("failing");

    res = await gate(url("components=sign-in&coverage=dependency"), slug);
    expect(res.status).toBe(412);
  });

  it("hides internal components from anonymous callers, not from a status:read key", async () => {
    await push("database");
    const anonymous = await gate(req("/g?components=database"), slug);
    expect((await anonymous.json()).components[0].reason).toBe("unknown_component");
    const keyed = await gate(req("/g?components=database", { key: keys.read }), slug);
    expect(keyed.status).toBe(200);
  });

  it("400s bad parameters", async () => {
    expect((await gate(req("/g"), slug)).status).toBe(400);
    expect((await gate(req("/g?components=a&since=yesterday"), slug)).status).toBe(400);
    expect((await gate(req("/g?components=a&coverage=vibes"), slug)).status).toBe(400);
  });
});

describe("feeds", () => {
  it("renders Atom and RSS with escaped content", async () => {
    process.env.STATUS_PUBLIC_URL = "https://status.acme.test/";
    await postIncident(
      req("/i", {
        method: "POST",
        key: keys.incidents,
        body: JSON.stringify({ title: "Errors <500>", message: "A & B" }),
      }),
      slug,
    );
    const a = await atom(req("/api/v1/pages/acme/feed.atom"), slug);
    expect(a.headers.get("content-type")).toBe("application/atom+xml; charset=utf-8");
    const atomText = await a.text();
    expect(atomText).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(atomText).toContain("<title>Errors &lt;500&gt;</title>");
    expect(atomText).toContain("<subtitle>Acme &amp; friends</subtitle>");
    expect(atomText).toContain("https://status.acme.test/p/acme#incident-");
    expect(atomText.match(/<entry>/g)).toHaveLength(1);

    const r = await rss(req("/api/v1/pages/acme/feed.rss"), slug);
    expect(r.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    const rssText = await r.text();
    expect(rssText).toContain('<rss version="2.0"');
    expect(rssText).toMatch(/<pubDate>\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT<\/pubDate>/);
    expect(rssText).toContain("A &amp;amp; B");
  });
});

describe("health", () => {
  it("healthz pings the database; readyz counts pages", async () => {
    const h = await healthz();
    expect(h.status).toBe(200);
    expect((await h.json()).database.ok).toBe(true);
    const r = await readyz();
    expect(await r.json()).toEqual({ ready: true, pages: 1 });
  });
});
