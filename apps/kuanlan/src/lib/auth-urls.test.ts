import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { kuanlanOrigin, kuanlanSignInUrl, shootSignInHref } from "./auth-urls";

describe("kuanlan auth center URLs", () => {
  const env = {
    NEXT_PUBLIC_SITE_URL: "https://kuanlan.nebutra.com",
    NEXT_PUBLIC_AUTH_URL: "https://auth.nebutra.com",
  };

  it("sends 进入 back to 观澜, not the app workspace", () => {
    const href = kuanlanSignInUrl("/me", env);

    expect(kuanlanOrigin(env)).toBe("https://kuanlan.nebutra.com");
    expect(href).toBe(
      "https://auth.nebutra.com/sign-in?returnTo=https%3A%2F%2Fkuanlan.nebutra.com%2Fme",
    );
    expect(href).not.toContain("app.nebutra.com");
    expect(href).not.toContain("workspace");
  });

  it("sends studio 进入 back into this shoot, not /me", () => {
    const href = shootSignInHref({ skuId: "linkedin-smoke", sizeId: "linkedin" }, env);
    expect(href).toContain("auth.nebutra.com/sign-in");
    expect(href).toContain(encodeURIComponent("/create/id-photo?sku=linkedin-smoke&size=linkedin"));
    expect(href).not.toContain("%2Fme");
  });

  it("keeps the chrome on auth.nebutra.com", () => {
    const nav = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/SiteNav.tsx"),
      "utf8",
    );
    const actions = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/AuthActions.tsx"),
      "utf8",
    );
    const layout = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../app/layout.tsx"),
      "utf8",
    );

    const gate = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/AuthGate.tsx"),
      "utf8",
    );
    const home = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../app/page.tsx"),
      "utf8",
    );
    expect(nav).toContain("AuthGate");
    expect(nav).toContain('label: "首页"');
    expect(nav).toContain('label: "今天拍"');
    expect(nav).toContain('href="/create/id-photo"');
    expect(home).toContain('href="/create/id-photo"');
    expect(home).toContain("看看灵感");
    expect(gate).toContain("returnPath");
    expect(gate).not.toContain('kuanlanSignInUrl("/me")');
    expect(actions).toContain("进入");
    expect(actions).toContain("离开");
    expect(actions).toContain("signInHref");
    expect(actions).toContain("searchParams.set");
    expect(actions).toContain("@nebutra/auth/client");
    expect(actions).not.toContain("app.nebutra.com");
    expect(layout).toContain("AuthProvider");
    expect(layout).toContain('getBrandOrigin("auth")');
  });
});
