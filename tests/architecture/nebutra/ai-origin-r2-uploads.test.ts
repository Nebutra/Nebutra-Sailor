import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * The python-ai origin persists generated images to nebutra-uploads. The shared GitHub `R2_*`
 * pair is the *assets seeder*: it can read nebutra-assets but holds no Object Write on uploads.
 * Staging it onto nebutra-ai is what made every generation fail at persist time while /health
 * stayed green and the deploy stayed green — the worst shape of failure this repo has shipped.
 *
 * So the origin owns its own minted key, and the deploy must never stage the shared pair over it.
 */
describe("python-ai origin uploads credentials", () => {
  const deploy = readFileSync(resolve(ROOT, ".github/workflows/deploy-ai-origin-fly.yml"), "utf-8");

  it("never stages the shared assets-seeder object key onto nebutra-ai", () => {
    expect(
      deploy.includes("secrets.R2_ACCESS_KEY_ID"),
      "the shared R2_* pair cannot write nebutra-uploads; let ops-origin-r2-uploads.yml own it",
    ).toBe(false);
    expect(deploy.includes("secrets.R2_SECRET_ACCESS_KEY")).toBe(false);
    // The account id is not a credential and stays CI-owned.
    expect(deploy).toContain("secrets.R2_ACCOUNT_ID");
  });

  it("warns on deploy when the origin holds no uploads key of its own", () => {
    expect(deploy).toContain("Check the origin holds its own uploads key");
    expect(deploy).toContain("ops-origin-r2-uploads.yml");
  });

  it("mints the origin key through the one canonical provisioning script", () => {
    const mint = readFileSync(
      resolve(ROOT, ".github/workflows/ops-origin-r2-uploads.yml"),
      "utf-8",
    );
    expect(mint).toContain("provision-origin-r2-uploads-token.sh");
    expect(mint).toContain("CLOUDFLARE_API_TOKEN");

    const wrapper = readFileSync(
      resolve(ROOT, "infra/ops/scripts/provision-origin-r2-uploads-token.sh"),
      "utf-8",
    );
    expect(wrapper).toContain("provision-r2-uploads-token.sh");
    expect(wrapper).toContain("nebutra-ai");
    // Listing is not the capability this app needs; a list-only token looks healthy and is not.
    expect(wrapper).toContain("R2_VERIFY_PUT=1");
  });

  it("verifies PutObject before it reports success, and never prints the secret", () => {
    const script = readFileSync(
      resolve(ROOT, "infra/ops/scripts/provision-r2-uploads-token.sh"),
      "utf-8",
    );
    expect(script).toContain("nebutra-uploads");
    expect(script).toContain('step("put", "PUT"');
    expect(script).toContain('step("delete", "DELETE"');
    expect(script).not.toContain('echo "$ACCESS_KEY_ID"');
    expect(script).not.toContain('echo "$SECRET_ACCESS_KEY"');
  });
});
