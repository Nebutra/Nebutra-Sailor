import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract lock for kuanlan.nebutra.com — 观澜 stays on its own host.
 * Unknown Host on this box 301s to nebutra.com; without the vhost include,
 * Create / Wardrobe / Moments / Me become marketing 404s.
 */
describe("kuanlan nginx vhost", () => {
  const conf = join(process.cwd(), "infra/runtime/nginx/conf.d/kuanlan.nebutra.com.conf");
  const mainNginx = join(process.cwd(), "infra/runtime/nginx/nginx.conf");
  const ecsNginx = join(process.cwd(), "infra/runtime/nginx/nginx-ecs-current.conf");
  const install = join(process.cwd(), "infra/ops/scripts/install-kuanlan-nginx-vhost.sh");

  it("ships a vhost that proxies :3120 and never 301s to apex", () => {
    expect(existsSync(conf), conf).toBe(true);
    const body = readFileSync(conf, "utf-8");
    expect(body).toContain("server_name kuanlan.nebutra.com");
    expect(body).toContain("127.0.0.1:3120");
    expect(body).toContain("proxy_pass http://nebutra_kuanlan");
    expect(body).not.toMatch(/return 301 https:\/\/nebutra\.com/);
  });

  it("is included from both nginx entry confs so a later ECS deploy cannot drop it", () => {
    expect(readFileSync(mainNginx, "utf-8")).toContain("kuanlan.nebutra.com.conf");
    expect(readFileSync(ecsNginx, "utf-8")).toContain("kuanlan.nebutra.com.conf");
    expect(readFileSync(mainNginx, "utf-8")).toContain("carina.nebutra.com.conf");
  });

  it("has an inject script that patches live nginx instead of replacing it", () => {
    expect(existsSync(install), install).toBe(true);
    const body = readFileSync(install, "utf-8");
    expect(body).toContain("kuanlan.nebutra.com.conf");
    expect(body).toContain("ensure_include");
    expect(body).not.toMatch(/scp .*nginx\.conf/);
  });
});
