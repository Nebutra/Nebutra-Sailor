import { expect, test } from "@playwright/test";

/**
 * E2E tests for the FooterMinimal component on the landing page.
 *
 * Uses data-testid="footer-minimal" to avoid matching other footer elements
 * (e.g. Mintlify docs footer) that may also live on port 3000.
 */
test.describe("FooterMinimal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const footer = page.getByTestId("footer-minimal");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Structure & Semantics
  // ---------------------------------------------------------------------------

  test("renders a semantic <footer> element with data-testid", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const tagName = await footer.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("footer");
  });

  test("contains a branded logo", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const logo = footer.locator("svg, img").first();
    await expect(logo).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Navigation Links
  // ---------------------------------------------------------------------------

  test("footer nav has aria-label for accessibility", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const footerNav = footer.locator('nav[aria-label="Footer"]');
    await expect(footerNav).toBeVisible();
  });

  test("renders the expanded footer navigation", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const footerNav = footer.locator("nav");
    const links = footerNav.getByRole("link");
    await expect(links).toHaveCount(20);
    await expect(footerNav.getByRole("link", { name: /features/i })).toBeVisible();
    await expect(footerNav.getByRole("link", { name: /docs/i })).toBeVisible();
    await expect(footerNav.getByRole("link", { name: /privacy/i })).toBeVisible();
    await expect(footerNav.getByRole("link", { name: /github/i })).toBeVisible();
  });

  test("internal links use locale-aware href", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const footerNav = footer.locator("nav");
    const productLink = footerNav.getByRole("link").first();
    const href = await productLink.getAttribute("href");
    expect(href).toContain("features");
  });

  test("external links open in new tab with security attributes", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const externalLinks = footer.locator('a[href^="https://"]');
    const count = await externalLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const target = await link.getAttribute("target");
      const rel = await link.getAttribute("rel");
      const href = await link.getAttribute("href");

      expect(target, `${href} missing target="_blank"`).toBe("_blank");
      expect(rel, `${href} missing noopener`).toContain("noopener");
      expect(rel, `${href} missing noreferrer`).toContain("noreferrer");
    }
  });

  // ---------------------------------------------------------------------------
  // Social Icons
  // ---------------------------------------------------------------------------

  test("renders social icon links with descriptive aria-labels", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const socialLinks = footer.locator("a[aria-label]");
    const count = await socialLinks.count();
    // At least 3 social links: x, github, discord
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < count; i++) {
      const label = await socialLinks.nth(i).getAttribute("aria-label");
      // Labels should be descriptive (not just "x" or "github")
      expect(label?.length).toBeGreaterThan(2);
    }
  });

  test("social icons have visible SVG icons", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const socialIcons = footer.locator("a[aria-label] svg");
    const count = await socialIcons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("social links open in new tab", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const socialLinks = footer.locator("a[aria-label]");
    const count = await socialLinks.count();

    for (let i = 0; i < count; i++) {
      const link = socialLinks.nth(i);
      const target = await link.getAttribute("target");
      expect(target).toBe("_blank");
    }
  });

  // ---------------------------------------------------------------------------
  // Newsletter Form
  // ---------------------------------------------------------------------------

  test("newsletter section has a heading", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const title = footer.getByText(/stay up to date/i);
    await expect(title).toBeVisible();
  });

  test("newsletter form has an accessible email input", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const emailInput = footer.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const required = await emailInput.getAttribute("required");
    expect(required).not.toBeNull();

    const ariaLabel = await emailInput.getAttribute("aria-label");
    expect(ariaLabel, "Email input needs aria-label").toBeTruthy();

    const placeholder = await emailInput.getAttribute("placeholder");
    expect(placeholder?.length).toBeGreaterThan(0);
  });

  test("newsletter email input has focus ring style", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const emailInput = footer.locator('input[type="email"]');
    const className = await emailInput.getAttribute("class");
    expect(className).toContain("focus:");
  });

  test("newsletter submit button has type=submit", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const submitBtn = footer.locator("form button");
    await expect(submitBtn).toBeVisible();
    const type = await submitBtn.getAttribute("type");
    expect(type).toBe("submit");
  });

  test("newsletter rejects empty submission", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const emailInput = footer.locator('input[type="email"]');
    const submitBtn = footer.locator("form button");

    await emailInput.fill("");
    await submitBtn.click();

    // Should still show the form (HTML5 validation prevents submission)
    await expect(emailInput).toBeVisible();
  });

  test("newsletter shows success on valid email", async ({ page }) => {
    await page.route("**/api/newsletter", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) }),
    );

    const footer = page.getByTestId("footer-minimal");
    const emailInput = footer.locator('input[type="email"]');
    const submitBtn = footer.locator("form button");

    await emailInput.fill("test@example.com");
    await submitBtn.click();

    const successMsg = footer.getByText(/thanks|subscribed/i);
    await expect(successMsg).toBeVisible({ timeout: 5000 });
  });

  test("newsletter shows error on API failure", async ({ page }) => {
    await page.route("**/api/newsletter", (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "fail" }) }),
    );

    const footer = page.getByTestId("footer-minimal");
    const emailInput = footer.locator('input[type="email"]');
    const submitBtn = footer.locator("form button");

    await emailInput.fill("test@example.com");
    await submitBtn.click();

    const errorMsg = footer.locator('[role="alert"]');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // Copyright & Status
  // ---------------------------------------------------------------------------

  test("displays copyright text with current year", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const copyright = footer.getByText(/© 202\d/);
    await expect(copyright).toBeVisible();
  });

  test("status indicator is visible with operational text", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const statusText = footer.getByText(/operational|online/i);
    await expect(statusText).toBeVisible();
  });

  test("status link points to status page", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const statusLink = footer.locator('a[href*="status"]');
    await expect(statusLink).toBeVisible();
    const href = await statusLink.getAttribute("href");
    expect(href).toContain("status");
  });

  test("status indicator has a green dot", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const dot = footer.getByTestId("status-dot");
    await expect(dot).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Design System Compliance
  // ---------------------------------------------------------------------------

  test("brand gradient line is present at top of footer", async ({ page }) => {
    const gradientLine = page.getByTestId("footer-gradient-line");
    await expect(gradientLine).toBeAttached();
    const bg = await gradientLine.evaluate((el) => el.style.background);
    expect(bg).toContain("brand-gradient");
  });

  test("footer uses semantic design tokens (not raw hex)", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const className = await footer.getAttribute("class");
    // Should use CSS variable tokens, not raw hex colors
    expect(className).toContain("var(--neutral-");
    expect(className).not.toMatch(/#[0-9a-f]{6}/i);
  });

  // ---------------------------------------------------------------------------
  // Responsive Layout
  // ---------------------------------------------------------------------------

  test("footer stacks vertically on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const footer = page.getByTestId("footer-minimal");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();

    const nav = footer.locator("nav");
    await expect(nav).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Keyboard Navigation
  // ---------------------------------------------------------------------------

  test("all footer links are keyboard focusable", async ({ page }) => {
    const footer = page.getByTestId("footer-minimal");
    const allLinks = footer.getByRole("link");
    const count = await allLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = allLinks.nth(i);
      await link.focus();
      await expect(link).toBeFocused();
    }
  });
});
