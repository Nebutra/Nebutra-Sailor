import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf-8");
interface StatusTtl {
  status_code_range?: { from?: number; to?: number };
  value: number;
}
interface LifecycleRule {
  enabled: boolean;
  abortMultipartUploadsTransition?: { condition: { type: string; maxAge: number } };
  deleteObjectsTransition?: { condition: { type: string; maxAge: number } };
}
interface CacheRule {
  name: string;
  expression: string;
  action_parameters: {
    edge_ttl: { status_code_ttl: StatusTtl[] };
    cache_key: { custom_key: { query_string: unknown } };
  };
}
const lifecycle = (bucket: string) =>
  JSON.parse(read(`infra/iac/cloudflare/r2/lifecycle/${bucket}.json`)).rules as LifecycleRule[];

const SCRIPT = "infra/ops/scripts/apply-r2-guardrails.sh";
const PRIVATE_BUCKETS = ["nebutra-uploads", "nebutra-pebble-diagnostics", "nebutra-backups"];

/**
 * R2 has no egress fee, so the bill is storage plus billed operations. The two ways that gets out
 * of hand are reads that miss the cache (every miss is a Class B read) and writes nobody caps.
 * These pin the guardrails that close both, and that they are applied from the repo.
 */
describe("R2 cost guardrails", () => {
  it("gives every private bucket a lifecycle file that aborts stale multipart uploads", () => {
    for (const bucket of PRIVATE_BUCKETS) {
      const path = `infra/iac/cloudflare/r2/lifecycle/${bucket}.json`;
      expect(existsSync(resolve(ROOT, path)), `${path} is missing`).toBe(true);
      const abort = lifecycle(bucket).find((r) => r.abortMultipartUploadsTransition);
      expect(abort?.enabled, `${bucket} must abort stale multipart uploads`).toBe(true);
      expect(abort?.abortMultipartUploadsTransition?.condition).toEqual({
        type: "Age",
        maxAge: 86400,
      });
    }
  });

  it("never expires user uploads or support bundles by lifecycle: that is a retention decision", () => {
    for (const bucket of ["nebutra-uploads", "nebutra-pebble-diagnostics"]) {
      expect(lifecycle(bucket).some((r) => r.deleteObjectsTransition)).toBe(false);
    }
  });

  it("keeps a backstop expiry on backups at or beyond the script's own retention", () => {
    const expire = lifecycle("nebutra-backups").find((r) => r.deleteObjectsTransition);
    const days = (expire?.deleteObjectsTransition?.condition.maxAge ?? 0) / 86400;
    expect(days).toBeGreaterThanOrEqual(7);
  });

  it("caches cdn.nebutra.com without the query string and without caching errors", () => {
    const rules = JSON.parse(read("infra/iac/cloudflare/rules/cache-rules.json"))
      .rules as CacheRule[];
    const cdn = rules.find((r) => r.name === "Cache CDN assets") as CacheRule;
    expect(cdn.expression).toContain("cdn.nebutra.com");
    expect(cdn.action_parameters.cache_key.custom_key.query_string).toEqual({
      exclude: { all: true },
    });
    const ttls = cdn.action_parameters.edge_ttl.status_code_ttl;
    expect(
      ttls.find((t) => t.status_code_range?.from === 300 && t.status_code_range?.to === 499),
    ).toMatchObject({ value: 0 });
    expect(ttls.find((t) => t.status_code_range?.from === 500)).toMatchObject({ value: -1 });
  });

  it("builds the applied rule from that same definition, hash and all", () => {
    const rule = JSON.parse(
      execFileSync("bash", [resolve(ROOT, SCRIPT), "print-cdn-rule"], { encoding: "utf-8" }),
    );
    expect(rule.ref).toBe("r2_cdn_assets");
    expect(rule.description).toMatch(/\[sha:[0-9a-f]{12}\]$/);
    expect(rule.action_parameters.cache_key.custom_key.query_string).toEqual({
      exclude: { all: true },
    });
  });

  it("applies both from CI, not by hand in the dashboard", () => {
    const wf = read(".github/workflows/ops-r2-guardrails.yml");
    expect(wf).toContain("apply-r2-guardrails.sh lifecycle");
    expect(wf).toContain("apply-r2-guardrails.sh cdn-cache");
    expect(wf).toContain("infra/iac/cloudflare/r2/lifecycle/**");
    expect(wf).toContain("infra/iac/cloudflare/rules/cache-rules.json");
    // A guardrail that silently skips reads as one that is on.
    expect(wf).not.toMatch(/\|\|\s*true/);
    expect(read(SCRIPT)).not.toContain("::warning");
  });

  it("does not let the Next image optimizer reach the bucket through r2.dev", () => {
    expect(read("apps/kuanlan/next.config.ts")).not.toContain("r2.dev");
  });

  it("signs the declared size into every presigned upload the python origin hands out", () => {
    const routes = read("backends/python/ai/app/api/v1/routes_uploads.py");
    expect(routes.match(/content_length=/g)?.length).toBe(2);
    expect(read("backends/python/ai/app/uploads/storage.py")).toContain('"ContentLength"');
  });
});
