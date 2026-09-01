import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract lock for router.nebutra.com /v1 — consume hits New-API on :3301,
 * not the Next UI on :3106.
 */
describe("router nginx /v1 consume", () => {
  const conf = join(process.cwd(), "infra/runtime/nginx/conf.d/router.nebutra.com.conf");
  const install = join(process.cwd(), "infra/ops/scripts/install-router-v1-nginx.sh");
  const seed = join(process.cwd(), "infra/ops/scripts/seed-kuanlan-router-key.sh");

  it("proxies /v1 to localhost New-API and leaves / on the router UI", () => {
    expect(existsSync(conf), conf).toBe(true);
    const body = readFileSync(conf, "utf-8");
    expect(body).toContain("server_name router.nebutra.com");
    expect(body).toContain("127.0.0.1:3106");
    expect(body).toContain("127.0.0.1:3301");
    expect(body).toContain("location ^~ /v1");
    expect(body).toContain("proxy_pass http://nebutra_new_api");
    expect(body).toContain("proxy_pass http://nebutra_router");
    expect(body).not.toMatch(/listen\s+3301/);
  });

  it("has an inject script that only replaces the router vhost", () => {
    expect(existsSync(install), install).toBe(true);
    const body = readFileSync(install, "utf-8");
    expect(body).toContain("router.nebutra.com.conf");
    expect(body).toContain("nebutra_new_api");
    expect(body).not.toMatch(/scp .*nginx\.conf/);
  });

  it("issues a New-API user token into kuanlan, not the 302 channel key", () => {
    expect(existsSync(seed), seed).toBe(true);
    const body = readFileSync(seed, "utf-8");
    expect(body).toContain("ROUTER_API_KEY");
    expect(body).toContain("seed-kuanlan-router-key.remote.py");
    expect(body).not.toContain("IMAGE2_API_KEY=");
    expect(body).not.toMatch(/echo "\$CHANNEL_302_KEY"/);
  });
});
