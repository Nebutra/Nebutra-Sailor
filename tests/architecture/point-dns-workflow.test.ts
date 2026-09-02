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
  "docs",
  "forge",
  "kuanlan",
  "leak",
  "open",
  "pebble",
  "router",
  "status",
  "www",
];
const TARGETS = ["cloudflare-worker", "ecs", "vercel", "apex", "authoritative"];

// Every (host, target) pair the one-shots supported, and the script each ran.
const SUPPORTED: Record<string, string> = {
  "auth/cloudflare-worker": "point-auth-dns-cloudflare-worker.sh",
  "auth/ecs": "point-auth-dns-ecs.sh",
  "auth/vercel": "point-auth-dns-vercel.sh",
  "carina/vercel": "point-carina-dns-vercel.sh",
  "design/ecs": "point-design-dns-ecs.sh",
  "docs/ecs": "point-docs-dns-ecs.sh",
  "docs/cloudflare-worker": "point-docs-dns-cloudflare-worker.sh",
  "docs/vercel": "point-docs-dns-vercel.sh",
  "forge/ecs": "point-forge-dns-ecs.sh",
  "kuanlan/ecs": "point-kuanlan-dns-ecs.sh",
  "leak/authoritative": "point-leak-zone-dns.sh",
  "open/vercel": "point-open-dns-vercel.sh",
  "pebble/vercel": "point-pebble-dns-vercel.sh",
  "router/ecs": "point-router-dns-ecs.sh",
  "status/vercel": "point-status-dns-vercel.sh",
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

  it("keeps the open host's Vercel domain-attach step and per-host smoke", () => {
    const attach = steps.find((s) => s.name === "Attach open.nebutra.com on nebutra-landing");
    expect(attach?.if).toBe("inputs.host == 'open'");
    const smoke = steps.find((s) => s.name?.startsWith("Smoke"))?.run ?? "";
    for (const host of HOSTS) {
      expect(smoke, `smoke step must handle host=${host}`).toMatch(
        new RegExp(`(^|[|\\s])${host}(\\||\\))`, "m"),
      );
    }
  });
});
