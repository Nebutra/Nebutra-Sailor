import { expect, test } from "@playwright/test";

const COMMUNITY_URL = "http://localhost:3003";

/**
 * Résumé editor — unauthenticated surface only. The signed-in flow needs a
 * Clerk test user and a database; that lands with R2 alongside the public page.
 */
test.describe("Résumé editor (unauthenticated)", () => {
  test("/resume/edit is gated by Clerk middleware", async ({ page }) => {
    const res = await page.goto(`${COMMUNITY_URL}/resume/edit`);
    // clerkMiddleware auth.protect() redirects to the sign-in URL (Clerk hosted or app route).
    await page.waitForLoadState("domcontentloaded");
    const landed = page.url();
    const gated = !landed.endsWith("/resume/edit") || (res?.status() ?? 200) >= 400;
    expect(gated, `expected a redirect or 4xx, got ${landed} ${res?.status()}`).toBe(true);
  });

  test("/api/resume rejects anonymous callers", async ({ request }) => {
    const res = await request.get(`${COMMUNITY_URL}/api/resume`, { maxRedirects: 0 });
    expect([401, 403, 302, 307]).toContain(res.status());
  });

  test("/api/resume PUT rejects anonymous callers", async ({ request }) => {
    const res = await request.put(`${COMMUNITY_URL}/api/resume`, {
      data: { content: { basic: { name: "Nobody" } } },
      maxRedirects: 0,
    });
    expect([401, 403, 302, 307]).toContain(res.status());
  });
});
