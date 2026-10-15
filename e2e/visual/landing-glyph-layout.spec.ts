import { expect, test } from "@playwright/test";

const baseURL = process.env.VISUAL_LANDING_BASE_URL ?? "http://localhost:3200";

for (const locale of ["en", "zh-Hans"]) {
  test(`${locale} feature glyphs keep their content inside the drawing`, async ({
    page,
  }, testInfo) => {
    await page.goto(`${baseURL}/${locale}/features`);
    await page.evaluate(() => document.fonts.ready);
    for (const slug of [
      "agents",
      "permissions",
      "tokens",
      "notifications",
      "agent-runtime",
      "auth",
      "db",
      "knowledge-rag",
      "gateway-core",
    ]) {
      const card = page.locator(`section a[href$="/features/${slug}"]`).first();
      await expect(card).toBeVisible();
      const violations = await card.evaluate((element) => {
        const drawing = element.firstElementChild?.firstElementChild?.firstElementChild;
        if (!drawing) return ["missing drawing"];
        const bounds = drawing.getBoundingClientRect();
        return [...drawing.querySelectorAll("*")].flatMap((child) => {
          const rect = child.getBoundingClientRect();
          if (!rect.width || !rect.height) return [];
          return rect.bottom > bounds.bottom + 1 ||
            rect.right > bounds.right + 1 ||
            rect.left < bounds.left - 1 ||
            rect.top < bounds.top - 1
            ? [child.textContent?.trim() || child.tagName]
            : [];
        });
      });
      expect(violations, slug).toEqual([]);
      if (slug === "permissions") {
        const clipped = await card.evaluate((element) =>
          [...element.querySelectorAll("div.overflow-hidden")].some(
            (table) => table.scrollHeight > table.clientHeight + 1,
          ),
        );
        expect(clipped, "permission rows must not be clipped").toBe(false);
        await expect(card.getByText("delete", { exact: true })).toBeVisible();
      }
      await testInfo.attach(`${slug}-layout`, {
        body: await card.screenshot(),
        contentType: "image/png",
      });
    }
  });
}
