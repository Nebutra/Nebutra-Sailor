import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/**
 * DNS cutovers for nebutra.com hosts run through ONE parameterized workflow,
 * `.github/workflows/point-dns.yml` (host × target), which dispatches to the
 * existing `infra/ops/scripts/point-*.sh`. Twelve per-host one-shots used to
 * do this; they drifted apart (token fallbacks, ECS_HOST precedence, smoke
 * shapes) and every new host meant another copy. This file keeps the
 * consolidation from silently un-happening.
 */

const ROOT = process.cwd();
const WORKFLOW = ".github/workflows/point-dns.yml";
const HOSTS = [
  "auth",
  "carina",
  "design",
  "forge",
  "kuanlan",
  "landing",
  "leak",
  "open",
  "para",
  "pebble",
  "router",
  "status",
  "www",
];
// The Vercel target was retired on 2026-09-22; every product host is Fly or ECS.
const TARGETS = ["cloudflare-worker", "ecs", "fly", "apex", "authoritative"];

// Every (host, target) pair the workflow supports, and the script each runs.
const SUPPORTED: Record<string, string> = {
  "auth/cloudflare-worker": "point-auth-dns-cloudflare-worker.sh",
  "auth/ecs": "point-auth-dns-ecs.sh",
  // Landing owns the apex plus www/status/open, so it has its own script.
  "landing/fly": "point-landing-dns-fly.sh",
  "carina/fly": "point-fly-dns.sh",
  "design/ecs": "point-design-dns-ecs.sh",
  "forge/ecs": "point-forge-dns-ecs.sh",
  "kuanlan/ecs": "point-kuanlan-dns-ecs.sh",
  "leak/authoritative": "point-leak-zone-dns.sh",
  "open/fly": "point-fly-dns.sh",
  // The one generic script: every Fly product edge takes the same proxied-CNAME shape.
  "para/fly": "point-fly-dns.sh",
  "pebble/fly": "point-fly-dns.sh",
  "router/ecs": "point-router-dns-ecs.sh",
  "status/fly": "point-fly-dns.sh",
  "www/apex": "point-www-dns-apex.sh",
};

type Step = { name?: string; id?: string; run?: string; if?: string };
type Workflow = {
  on: {
    workflow_dispatch?: { inputs?: Record<string, { type?: string; options?: string[] }> };
  };
  jobs: Record<string, { steps: Step[] }>;
};

const raw = readFileSync(join(ROOT, WORKFLOW), "utf-8");
const wf = parse(raw) as Workflow;
const steps = Object.values(wf.jobs).flatMap((job) => job.steps);
const resolve = steps.find((s) => s.id === "resolve")?.run ?? "";

describe("point-dns.yml — one parameterized DNS cutover", () => {
  it("is the only point-*-dns workflow left", () => {
    const oneShots = readdirSync(join(ROOT, ".github/workflows")).filter((f) =>
      /^point-.+-dns\.ya?ml$/.test(f),
    );
    expect(oneShots, "re-adding a per-host one-shot; extend point-dns.yml instead").toEqual([]);
    expect(existsSync(join(ROOT, WORKFLOW))).toBe(true);
  });

  it("is workflow_dispatch only, with host and target choice inputs", () => {
    expect(Object.keys(wf.on)).toEqual(["workflow_dispatch"]);
    const inputs = wf.on.workflow_dispatch?.inputs ?? {};
    expect(inputs.host?.type).toBe("choice");
    expect(inputs.host?.options).toEqual(HOSTS);
    expect(inputs.target?.type).toBe("choice");
    expect(inputs.target?.options).toEqual(TARGETS);
  });

  it("routes every supported (host, target) pair to a script that exists", () => {
    for (const [pair, script] of Object.entries(SUPPORTED)) {
      expect(resolve, `resolve step must route ${pair}`).toContain(`${pair})`);
      expect(resolve, `${pair} must dispatch to ${script}`).toContain(script);
      expect(
        existsSync(join(ROOT, "infra/ops/scripts", script)),
        `infra/ops/scripts/${script} referenced by ${WORKFLOW} is missing`,
      ).toBe(true);
    }
  });

  it("fails fast with ::error on an unsupported pair, before touching Cloudflare", () => {
    expect(resolve).toContain("::error::unsupported combination");
    const resolveIndex = steps.findIndex((s) => s.id === "resolve");
    const pointIndex = steps.findIndex((s) => s.run?.includes('bash "$SCRIPT"'));
    expect(resolveIndex).toBeGreaterThanOrEqual(0);
    expect(pointIndex).toBeGreaterThan(resolveIndex);
  });

  it("keeps per-host smoke coverage and no Vercel step", () => {
    expect(raw).not.toContain("VERCEL_TOKEN");
    expect(raw).not.toContain("api.vercel.com");
    const smoke = steps.find((s) => s.name?.startsWith("Smoke"))?.run ?? "";
    for (const host of HOSTS) {
      expect(smoke, `smoke step must handle host=${host}`).toMatch(
        new RegExp(`(^|[|\\s])${host}(\\||\\))`, "m"),
      );
    }
  });
});
