import { brand } from "@nebutra/brand/metadata";
import { describe, expect, it, vi } from "vitest";
import { GET } from "../llms.txt/route";

// The template loads translated copy asynchronously. Both handlers share the
// response contract, so the test accepts either a response or its promise.
vi.mock("next-intl/server", () => ({
  getTranslations:
    async ({ namespace }: { namespace: string }) =>
    (key: string) =>
      `${namespace}.${key}`,
}));

describe("/llms.txt (G16)", () => {
  it("returns a cacheable plain-text site map", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);
    expect(res.headers.get("Cache-Control")).toContain("public");
    const body = await res.text();
    expect(body).toContain(`# ${brand.name}`);
    expect(body).toContain("/pricing");
    expect(body).toContain("/blog");
    expect(body).toContain("/privacy");
  });
});
