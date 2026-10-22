import { expect, test } from "@playwright/test";
import { apiForEntry } from "../../apps/design/src/lib/components/api-docs";
import { COMPONENTS } from "../../apps/design/src/lib/components/registry";

const prose = (text: string) => text.replace(/`/g, "").replace(/\s+/g, " ").trim();

for (const entry of COMPONENTS) {
  test(`${entry.slug} renders live docs, source descriptions, and contained content`, async ({
    page,
  }) => {
    const response = await page.goto(`/components/${entry.slug}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: entry.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(entry.blurb, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Playground", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "States", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("group", { name: "Preview", exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Props", exact: true })).toBeVisible();

    // Compare the built page with current library JSDoc, including inline-code prose.
    const primary = apiForEntry(entry, COMPONENTS).blocks[0];
    expect(primary, `${entry.name} must resolve to a source API block`).toBeDefined();
    const description = prose(primary?.description ?? "");
    expect(description, `${entry.name} needs source documentation`).not.toBe("");
    const api = page.locator("section#api");
    await expect(api.getByText(description, { exact: true })).toBeVisible();
    const prop = primary?.props.find((candidate) => candidate.description.trim());
    if (prop) {
      const row = api
        .getByRole("row")
        .filter({ has: page.getByText(prop.name, { exact: true }) })
        .first();
      await expect(row).toContainText(prose(prop.description));
    }

    await page.evaluate(() => document.fonts.ready);
    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(widths.document, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
    expect(widths.body, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
  });
}
