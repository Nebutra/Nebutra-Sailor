import { expect, test } from "@playwright/test";

const COMMUNITY_URL = "http://localhost:3003";
const LANDING_URL = "http://localhost:3000";

test.describe("Sleptons Community Gallery", () => {
  test("gallery page loads and shows member count", async ({ page }) => {
    await page.goto(COMMUNITY_URL);
    await expect(page.getByRole("heading", { name: "SLEPTONS", level: 1 })).toBeVisible();
    await expect(page.getByText(/\d+ founders/)).toBeVisible();
  });

  test("gallery grid renders member cards or empty state", async ({ page }) => {
    await page.goto(COMMUNITY_URL);
    const hasCards = await page.locator("a[href^='/members/']").count();
    const hasEmpty = await page.getByText(/no members found/i).count();
    expect(hasCards + hasEmpty).toBeGreaterThan(0);
  });
});

test.describe("Welcome Overlay", () => {
  test("welcome overlay appears when ?welcome=true + memberNumber in localStorage", async ({
    page,
  }) => {
    await page.goto(COMMUNITY_URL);
    await page.evaluate(() => {
      localStorage.setItem("sleptons_member_number", "42");
    });

    await page.goto(`${COMMUNITY_URL}?welcome=true`);
    await expect(page.getByRole("heading", { name: "SLEPTONS", level: 1 })).toBeVisible();
    await expect(page.getByText(/Member #42/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Welcome to Sleptons/)).toBeVisible();
  });

  test("overlay dismisses on explore button click", async ({ page }) => {
    await page.goto(COMMUNITY_URL);
    await page.evaluate(() => {
      localStorage.setItem("sleptons_member_number", "7");
    });

    await page.goto(`${COMMUNITY_URL}?welcome=true`);
    await page.getByRole("button", { name: /explore/i }).click();
    await expect(page.getByText(/Welcome to Sleptons/)).not.toBeVisible();
  });

  test("URL no longer contains ?welcome after dismiss", async ({ page }) => {
    await page.goto(COMMUNITY_URL);
    await page.evaluate(() => {
      localStorage.setItem("sleptons_member_number", "7");
    });

    await page.goto(`${COMMUNITY_URL}?welcome=true`);
    await page.getByRole("button", { name: /explore/i }).click();
    await expect(page).not.toHaveURL(/welcome=true/);
  });
});

test.describe("License Flow → Community Redirect", () => {
  test.skip(
    !process.env["CLERK_TEST_USER_ID"],
    "Requires real Clerk test user — set CLERK_TEST_USER_ID to enable",
  );

  test("completing license wizard redirects to community with welcome overlay", async ({
    page,
  }) => {
    await page.goto(`${LANDING_URL}/en/get-license`);
    await expect(page.getByText(/Tell us about yourself/i)).toBeVisible();

    await page.getByText("Solo Developer").click();
    await page.getByLabel("Just me (1)").check();
    await page.getByRole("button", { name: /next/i }).click();

    await page.getByText("AI Tool / Copilot").click();
    await page.getByRole("button", { name: /next/i }).click();

    await page.getByText("OPC Free License").click();
    await page.getByLabel("Early users").check();
    await page.getByRole("button", { name: /get license/i }).click();

    await expect(page.getByText(/Redirecting you to Sleptons/i)).toBeVisible({ timeout: 10000 });

    await page.waitForURL(`${COMMUNITY_URL}/**`, { timeout: 10000 });
    await expect(page.getByText(/Welcome to Sleptons/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
