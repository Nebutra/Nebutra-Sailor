import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND } from "../../../scripts/brand-types";
import { buildVercelEnvPatches } from "../../../scripts/brand-vercel-env";

describe("vercel env brand dogfood", () => {
  it("patches use brand.domains", () => {
    const p = buildVercelEnvPatches(DEFAULT_BRAND);
    expect(p["apps/web/vercel.json"].NEXT_PUBLIC_APP_URL).toBe(
      `https://${DEFAULT_BRAND.domains.app}`,
    );
    expect(p["apps/web/vercel.json"].NEXT_PUBLIC_AUTH_URL).toBe(
      `https://${DEFAULT_BRAND.domains.auth}`,
    );
    expect(p["apps/router/vercel.json"].NEXT_PUBLIC_ROUTER_URL).toBe(
      `https://${DEFAULT_BRAND.domains.router}`,
    );
  });
});
