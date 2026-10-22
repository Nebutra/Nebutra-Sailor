import { expect, type Locator, type Page, test } from "@playwright/test";

async function selectVanta(page: Page) {
  await page.getByRole("button", { name: /^Design language:/ }).click();
  await page.getByRole("menuitemradio", { name: /^Vanta\b/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-brand", "vanta");
  await page.evaluate(() => document.fonts.ready);
}

const previewOf = (page: Page) => page.getByRole("group", { name: "Preview", exact: true });
const propsOf = (page: Page) => page.getByRole("complementary", { name: "Props", exact: true });
const codeOf = (page: Page) => page.locator("#playground pre code");

async function backgroundOf(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
}

for (const slug of ["field", "radio-group"]) {
  test(`${slug} state matrix scrolls locally without compressing controls or widening the page`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Narrow viewport containment regression");
    await page.goto(`/components/${slug}`);
    const table = page.locator("#states table");
    const scrollArea = table.locator("..");
    await table.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const geometry = await scrollArea.evaluate((element) => ({
      width: element.clientWidth,
      contentWidth: element.scrollWidth,
    }));
    expect(geometry.contentWidth).toBeGreaterThan(geometry.width);
    await scrollArea.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    expect(await scrollArea.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expectNoOverflow(page);
    const lastControl =
      slug === "field"
        ? table.getByRole("textbox").last()
        : table.getByText("Team", { exact: true }).last();
    await expect(lastControl).toBeInViewport();
    if (slug === "field") {
      expect((await lastControl.boundingBox())?.width).toBeGreaterThanOrEqual(280);
    }
  });
}

test("Vanta search fits its header and keeps the desktop placeholder on one line", async ({
  page,
}, testInfo) => {
  await page.goto("/components/button");
  await selectVanta(page);
  const search = page.getByRole("button", { name: "Search the design system", exact: true });
  const label = search.getByText("Search tokens, components…", { exact: true });
  await expect(search.locator("svg").first()).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await expect(label).toBeHidden();
    await search.click();
    await expect(page.getByPlaceholder("Search tokens, components, patterns…")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectNoOverflow(page);
    return;
  }
  await expect(search.locator("kbd")).toBeVisible();
  const geometry = await label.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return {
      lines: new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size,
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
      pillHeight: element.parentElement?.getBoundingClientRect().height ?? 0,
    };
  });
  expect(geometry.lines, JSON.stringify(geometry)).toBe(1);
  expect(geometry.height).toBeLessThanOrEqual(geometry.lineHeight + 1);
  expect(geometry.height).toBeLessThan(geometry.pillHeight);
  await testInfo.attach("vanta-search-single-line", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await expectNoOverflow(page);
});

test("Props clips its rounded top corners and tall controls leave the preview compact", async ({
  page,
}, testInfo) => {
  await page.goto("/components/button");
  await selectVanta(page);
  const props = propsOf(page);
  await props.locator(":scope > div").first().scrollIntoViewIfNeeded();
  const corners = await props.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      radius: Number.parseFloat(style.borderTopLeftRadius),
      headerCoversLeftCorner: element.contains(
        document.elementFromPoint(bounds.left + 1, bounds.top + 1),
      ),
      headerCoversRightCorner: element.contains(
        document.elementFromPoint(bounds.right - 1, bounds.top + 1),
      ),
    };
  });
  expect(corners.radius).toBeGreaterThan(0);
  expect(corners.headerCoversLeftCorner, JSON.stringify(corners)).toBe(false);
  expect(corners.headerCoversRightCorner, JSON.stringify(corners)).toBe(false);

  if (testInfo.project.name === "desktop") {
    const preview = await previewOf(page).boundingBox();
    const panel = await props.boundingBox();
    const code = await page.locator("#playground figure").boundingBox();
    expect(preview).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(code).not.toBeNull();
    if (!preview || !panel || !code) throw new Error("Playground panels must have layout boxes");
    expect(panel.height).toBeGreaterThan(preview.height + code.height + 16);
    expect(preview.height).toBeLessThanOrEqual(225);
    expect(code.y - (preview.y + preview.height)).toBeCloseTo(16, 0);
  }
  await expectNoOverflow(page);
});

test("keyboard focus preserves the canonical Combobox radius and two-pixel outline", async ({
  page,
}, testInfo) => {
  await page.goto("/components/combobox");
  await selectVanta(page);
  const trigger = previewOf(page).getByRole("combobox", { name: "Framework", exact: true });
  await trigger.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(trigger).not.toBeFocused();
  const before = await trigger.evaluate((element) => getComputedStyle(element).borderRadius);
  expect(Number.parseFloat(before)).toBeGreaterThan(0);
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  expect(await trigger.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await expect(trigger).toHaveCSS("border-radius", before);
  await expect(trigger).toHaveCSS("outline-width", "2px");
  await expect(trigger).toHaveCSS("outline-style", "solid");
  await expect(trigger).toHaveCSS("outline-offset", "2px");
  await testInfo.attach("combobox-keyboard-focus-screenshot", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await testInfo.attach("combobox-keyboard-focus", {
    body: JSON.stringify({
      before,
      after: await trigger.evaluate((element) => ({
        radius: getComputedStyle(element).borderRadius,
        outline: getComputedStyle(element).outline,
      })),
    }),
    contentType: "application/json",
  });
});

test("Button controls update the preview and copyable code, and Reset restores both", async ({
  page,
}) => {
  await page.goto("/components/button");
  const props = propsOf(page);
  const preview = previewOf(page);
  const code = codeOf(page);
  const initialCode = await code.innerText();
  const reset = props.getByRole("button", { name: "Reset", exact: true });
  await expect(reset).toBeDisabled();
  await props.getByRole("textbox", { name: "label", exact: true }).fill("Ship changes");
  await expect(preview.getByRole("button", { name: "Ship changes", exact: true })).toBeEnabled();
  await expect(code).toContainText("Ship changes");
  const disabled = props.getByRole("checkbox", { name: "disabled", exact: true });
  await disabled.press("Space");
  await expect(disabled).toBeChecked();
  await expect(preview.getByRole("button", { name: "Ship changes", exact: true })).toBeDisabled();
  await expect(code).toContainText("disabled");
  await reset.click();
  await expect(props.getByRole("textbox", { name: "label", exact: true })).toHaveValue("Deploy");
  await expect(preview.getByRole("button", { name: "Deploy", exact: true })).toBeEnabled();
  await expect(code).toHaveText(initialCode);
  await expect(reset).toBeDisabled();
});

test("Input message controls update visible help, validation semantics, and code", async ({
  page,
}) => {
  await page.goto("/components/input");
  const props = propsOf(page);
  const preview = previewOf(page);
  const input = preview.getByRole("textbox", { name: "Work email", exact: true });
  const code = codeOf(page);
  const initialCode = await code.innerText();
  const help = "Only your team can see this address.";
  const error = "Enter a work email.";
  await props.getByRole("textbox", { name: "description", exact: true }).fill(help);
  await expect(preview.getByText(help, { exact: true })).toBeVisible();
  await expect(input).toHaveAccessibleDescription(help);
  await expect(code).toContainText(`description="${help}"`);
  await props.getByRole("textbox", { name: "error", exact: true }).fill(error);
  await expect(preview.getByText(error, { exact: true })).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription(error);
  await expect(preview.getByText(help, { exact: true })).toHaveCount(0);
  await expect(code).toContainText(`error="${error}"`);
  await props.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription("");
  await expect(code).toHaveText(initialCode);
});

test("Light, Dark, and Split render distinct themes and portalled controls follow Dark", async ({
  page,
}, testInfo) => {
  await page.goto("/components/combobox");
  const themes = page.getByRole("group", { name: "Preview theme", exact: true });
  const preview = previewOf(page);
  const trigger = preview.getByRole("combobox", { name: "Framework", exact: true });
  await themes.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await expect(themes.getByRole("button", { name: "Light", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const lightBackground = await backgroundOf(preview);
  await trigger.click();
  const popup = page.getByRole("dialog");
  await expect(popup).toBeVisible();
  const lightPopup = await backgroundOf(popup);
  const lightPopupColor = await popup.evaluate((element) => getComputedStyle(element).color);
  expect(await popup.evaluate((element) => element.closest("main"))).toBeNull();
  await page.keyboard.press("Escape");

  await themes.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(themes.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(preview).not.toHaveCSS("background-color", lightBackground);
  await trigger.click();
  await expect(popup).toBeVisible();
  await expect(popup).not.toHaveCSS("background-color", lightPopup);
  const darkPopup = await backgroundOf(popup);
  const darkPopupColor = await popup.evaluate((element) => getComputedStyle(element).color);
  // Search and select by keyboard so this remains reliable when the popup is
  // positioned at the viewport edge on the narrow project.
  await popup.getByPlaceholder("Search frameworks...").fill("Astro");
  await page.keyboard.press("Enter");
  await expect(trigger).toContainText("Astro");
  await expect(popup).toHaveCount(0);

  await themes.getByRole("button", { name: "Split", exact: true }).click();
  await expect(themes.getByRole("button", { name: "Split", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  const states = page.getByRole("heading", { level: 2, name: "States", exact: true });
  await expect(states).toHaveCount(2);
  const panes = page.locator("section#states").locator("..");
  await expect(panes.nth(0)).not.toHaveClass(/\bdark\b/);
  await expect(panes.nth(1)).toHaveClass(/\bdark\b/);
  await expect(panes.nth(1)).not.toHaveCSS("background-color", await backgroundOf(panes.nth(0)));

  const rightPane = panes.nth(1);
  const rightTrigger = rightPane.getByRole("combobox", {
    name: "medium empty-selection framework",
    exact: true,
  });
  await rightTrigger.click();
  const splitPopup = page.getByRole("dialog");
  await expect(splitPopup).toBeVisible();
  await testInfo.attach("split-right-pane-overlay", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  expect(await splitPopup.evaluate((element) => Boolean(element.closest(".dark")))).toBe(true);
  expect(await backgroundOf(splitPopup)).toBe(darkPopup);
  expect(await splitPopup.evaluate((element) => getComputedStyle(element).color)).toBe(
    darkPopupColor,
  );
  expect(await backgroundOf(splitPopup)).not.toBe(lightPopup);
  expect(await splitPopup.evaluate((element) => getComputedStyle(element).color)).not.toBe(
    lightPopupColor,
  );
  await page.keyboard.press("Escape");
  await expect(splitPopup).toHaveCount(0);

  await expectNoOverflow(page);
  await themes.getByRole("button", { name: "Light", exact: true }).click();
  await expect(states).toHaveCount(1);
});

for (const slug of ["select", "dialog"] as const) {
  test(`${slug} in the right Split pane matches the dark overlay and restores keyboard focus`, async ({
    page,
  }) => {
    await page.goto(`/components/${slug}`);
    const themes = page.getByRole("group", { name: "Preview theme", exact: true });
    const triggerIn = (scope: Locator) =>
      slug === "select"
        ? scope.getByRole("combobox", { name: "Region", exact: true }).first()
        : scope.getByRole("button", { name: "Delete workspace", exact: true });
    const popup =
      slug === "select"
        ? page.getByRole("listbox")
        : page.getByRole("dialog", { name: "Delete workspace", exact: true });
    const surface = slug === "select" ? popup.locator("..") : popup;
    const colorsOf = (target: Locator) =>
      target.evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, foreground: style.color };
      });

    await themes.getByRole("button", { name: "Light", exact: true }).click();
    await triggerIn(page.locator("section#examples")).click();
    await expect(popup).toBeVisible();
    const light = await colorsOf(surface);
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);

    await themes.getByRole("button", { name: "Dark", exact: true }).click();
    await triggerIn(page.locator("section#examples")).click();
    await expect(popup).toBeVisible();
    const dark = await colorsOf(surface);
    expect(dark.background).not.toBe(light.background);
    expect(dark.foreground).not.toBe(light.foreground);
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);

    await themes.getByRole("button", { name: "Split", exact: true }).click();
    const rightPane = page.locator("section#examples").locator("..").nth(1);
    const trigger = triggerIn(rightPane);
    await trigger.click();
    await expect(popup).toBeVisible();
    expect(await popup.evaluate((element) => Boolean(element.closest(".dark")))).toBe(true);
    expect(await colorsOf(surface)).toEqual(dark);
    if (slug === "dialog") {
      for (let step = 0; step < 5; step++) {
        await page.keyboard.press("Tab");
        expect(await popup.evaluate((element) => element.contains(document.activeElement))).toBe(
          true,
        );
      }
    }
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expectNoOverflow(page);
  });
}
