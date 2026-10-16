import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

/**
 * nebutra.com and acme.nebutra.com serve their prerendered marketing pages from the Cloudflare
 * edge. The origin decides what is public (apps/landing/src/lib/edge-cache.ts); the deploy owns
 * the Cache Rules (infra/ops/scripts/apply-landing-edge-cache.sh, config in
 * infra/iac/cloudflare/edge-cache/landing.json). This pins the deploy-facing contract.
 */
const run = promisify(execFile);
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const SCRIPT = "infra/ops/scripts/apply-landing-edge-cache.sh";
const PAGES: string[] = JSON.parse(read("apps/landing/src/lib/edge-cached-pages.json"));

interface Rule {
  ref: string;
  expression: string;
  action_parameters: { cache: boolean };
}

async function printRules(group: string): Promise<Rule[]> {
  const { stdout } = await run("bash", [SCRIPT, "print-rules"], {
    env: { ...process.env, EDGE_GROUP: group },
  });
  return JSON.parse(stdout);
}

/** A fake Cloudflare API: records calls, answers from `routes`. */
async function fakeCloudflare(
  routes: (method: string, url: string, body: unknown) => unknown,
): Promise<{
  base: string;
  calls: { method: string; url: string; body: unknown }[];
  server: Server;
}> {
  const calls: { method: string; url: string; body: unknown }[] = [];
  const server = createServer(async (req: IncomingMessage, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    const method = req.method ?? "GET";
    const url = req.url ?? "/";
    calls.push({ method, url, body });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(routes(method, url, body)));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, calls, server };
}

const ok = (result: unknown) => ({ success: true, errors: [], result });
const refused = { success: false, errors: [{ code: 10000, message: "Authentication error" }] };
const ZONE = [{ id: "zone1" }];
const KCQ_RULE = { id: "k1", ref: "kcq_edge_cache_public", expression: "(kcq)" };

let open: Server | undefined;
afterEach(() => {
  open?.close();
  open = undefined;
});

async function apply(mode: string, group: string, base: string) {
  return run("bash", [SCRIPT, mode], {
    env: { ...process.env, EDGE_GROUP: group, CLOUDFLARE_API_TOKEN: "test", CF_API_BASE: base },
  });
}

describe("landing edge cache", () => {
  it("each group's rules cover exactly its hosts, bypass after public", async () => {
    const nebutra = await printRules("nebutra");
    const acme = await printRules("acme");
    expect(nebutra.map((r) => r.ref)).toEqual([
      "landing_edge_cache_public_nebutra",
      "landing_edge_cache_bypass_nebutra",
    ]);
    expect(nebutra[0].expression).toBe('(http.host in {"nebutra.com" "www.nebutra.com"})');
    expect(acme[0].expression).toBe('(http.host in {"acme.nebutra.com"})');
    for (const rules of [nebutra, acme]) {
      expect(rules[0].action_parameters.cache).toBe(true);
      expect(rules[1].action_parameters.cache).toBe(false);
      // Never cached whatever the origin says: route handlers, the docs zone, image
      // optimisation (varies on Accept), the cookie-painted preset stylesheet, RSC payloads.
      for (const needle of [
        'starts_with(http.request.uri.path, "/api/")',
        'starts_with(http.request.uri.path, "/docs")',
        'starts_with(http.request.uri.path, "/_next/image")',
        '"/preset-preview.css"',
        'any(lower(http.request.headers.names[*])[*] == "rsc")',
        'any(lower(http.request.headers.names[*])[*] == "next-router-prefetch")',
      ]) {
        expect(rules[1].expression).toContain(needle);
      }
    }
  });

  it("adds rules one by one, before nothing else is touched (no ruleset PUT)", async () => {
    const cf = await fakeCloudflare((_method, url) => {
      if (url.startsWith("/zones?")) return ok(ZONE);
      if (url.endsWith("/entrypoint")) return ok({ id: "rs1", rules: [KCQ_RULE] });
      return ok({});
    });
    open = cf.server;
    await apply("rules", "acme", cf.base);
    const writes = cf.calls.filter((c) => c.method !== "GET");
    expect(writes.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST /zones/zone1/rulesets/rs1/rules",
      "POST /zones/zone1/rulesets/rs1/rules",
    ]);
    expect((writes[0].body as Rule).ref).toBe("landing_edge_cache_public_acme");
    expect((writes[1].body as Rule).ref).toBe("landing_edge_cache_bypass_acme");
  });

  it("patches a changed rule, leaves a matching one, and keeps public before bypass", async () => {
    const [publicRule, bypassRule] = await printRules("nebutra");
    const cf = await fakeCloudflare((_method, url) => {
      if (url.startsWith("/zones?")) return ok(ZONE);
      if (url.endsWith("/entrypoint")) {
        return ok({
          id: "rs1",
          rules: [KCQ_RULE, { ...bypassRule, id: "b1", expression: "(old)" }],
        });
      }
      return ok({});
    });
    open = cf.server;
    await apply("rules", "nebutra", cf.base);
    const writes = cf.calls.filter((c) => c.method !== "GET");
    expect(writes.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST /zones/zone1/rulesets/rs1/rules",
      "PATCH /zones/zone1/rulesets/rs1/rules/b1",
    ]);
    expect(writes[0].body).toMatchObject({ ref: publicRule.ref, position: { before: "b1" } });

    const again = await fakeCloudflare((_method, url) => {
      if (url.startsWith("/zones?")) return ok(ZONE);
      if (url.endsWith("/entrypoint")) {
        return ok({
          id: "rs1",
          rules: [
            { ...publicRule, id: "p1" },
            { ...bypassRule, id: "b1" },
          ],
        });
      }
      return ok({});
    });
    open.close();
    open = again.server;
    const { stdout } = await apply("rules", "nebutra", again.base);
    expect(again.calls.filter((c) => c.method !== "GET")).toEqual([]);
    expect(stdout).toContain("already up to date");
  });

  it("purges by hostname, falling back to the public page URLs", async () => {
    const cf = await fakeCloudflare((_method, url, body) => {
      if (url.startsWith("/zones?")) return ok(ZONE);
      if (url.endsWith("/purge_cache"))
        return (body as { hosts?: string[] }).hosts ? refused : ok({});
      return ok({});
    });
    open = cf.server;
    const { stdout } = await apply("purge", "nebutra", cf.base);
    const purges = cf.calls.filter((c) => c.url.endsWith("/purge_cache"));
    expect(purges[0].body).toEqual({ hosts: ["nebutra.com", "www.nebutra.com"] });
    const files = purges.slice(1).flatMap((c) => (c.body as { files: string[] }).files);
    expect(purges.slice(1).every((c) => (c.body as { files: string[] }).files.length <= 30)).toBe(
      true,
    );
    expect(files).toContain("https://nebutra.com/");
    expect(files).toContain("https://nebutra.com/investors");
    expect(files).toContain("https://nebutra.com/zh-Hans/investors");
    expect(files).toContain("https://nebutra.com/zh-Hans");
    expect(files.some((u) => u.includes("www."))).toBe(false);
    expect(stdout).toContain("Purged");
  });

  it("is fail-soft: no token, or a token without permission, warns and exits 0", async () => {
    const { stdout } = await run("bash", [SCRIPT, "rules"], {
      env: { ...process.env, EDGE_GROUP: "nebutra", CLOUDFLARE_API_TOKEN: "" },
    });
    expect(stdout).toContain("::warning");
    const cf = await fakeCloudflare(() => refused);
    open = cf.server;
    const denied = await apply("rules", "nebutra", cf.base);
    expect(denied.stdout).toContain("Zone → Zone → Read");
  });

  it("every edge-cached page is a live static page with no request-time data", () => {
    const siteMap = read("apps/landing/src/site-map.ts");
    for (const page of PAGES) {
      expect(page, "no dynamic segments").not.toMatch(/\[/);
      expect(siteMap, `${page} is in the site map`).toContain(`path: "${page}"`);
      const dir = page === "/" ? "" : page;
      const file = ["(marketing)", "(legal)"]
        .map((group) => `apps/landing/src/app/[lang]/${group}${dir}/page.tsx`)
        .find((candidate) => existsSync(join(process.cwd(), candidate)));
      expect(file, `${page} has a page`).toBeDefined();
      const source = read(file as string);
      for (const dynamic of ["connection()", "headers()", "cookies()", "getAuth(", "draftMode("]) {
        expect(source, `${page} reads ${dynamic}`).not.toContain(dynamic);
      }
    }
    // Rendered per request: never edge-cached.
    for (const page of ["/pricing", "/licensing", "/get-license", "/refer", "/status"]) {
      expect(PAGES).not.toContain(page);
    }
  });

  it("both deploys apply the rules, purge after the deploy, and use the cache token", () => {
    // The workflow expression, spelled so it is not a template literal placeholder.
    const token = `CLOUDFLARE_API_TOKEN: $${"{{"} secrets.CLOUDFLARE_CACHE_API_TOKEN || secrets.CLOUDFLARE_API_TOKEN }}`;
    for (const [workflow, group] of [
      [".github/workflows/deploy-fly.yml", "nebutra"],
      [".github/workflows/deploy-acme.yml", "acme"],
    ] as const) {
      const yml = read(workflow);
      expect(yml).toContain(token);
      expect(yml).toContain(`EDGE_GROUP: ${group}`);
      const deploy = yml.indexOf("flyctl deploy");
      const rules = yml.indexOf("apply-landing-edge-cache.sh rules");
      const purge = yml.indexOf("apply-landing-edge-cache.sh purge");
      expect(deploy).toBeGreaterThan(-1);
      expect(rules).toBeGreaterThan(deploy);
      expect(purge).toBeGreaterThan(rules);
      expect(yml).toContain("verify-landing-edge-cache.sh");
    }
  });
});
