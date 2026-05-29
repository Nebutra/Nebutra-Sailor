import { expect, type Locator, type Page, type TestInfo, test } from "@playwright/test";
import {
  attachViewportScreenshot,
  expectNoHorizontalOverflow,
  expectStableVisualSurface,
  expectVisibleTextDensity,
  prepareVisualPage,
  projectTheme,
} from "./helpers/visual";

const DESIGN_DOCS_BASE_URL = process.env.VISUAL_DESIGN_DOCS_BASE_URL ?? "http://localhost:3203";

type PrimitiveCase = {
  component: "button" | "input" | "textarea" | "select";
  route: string;
  heading: RegExp;
  previewTextMinimum: number;
  exercise: (page: Page, testInfo: TestInfo) => Promise<void>;
};

const stableDeltaPx = 3;

async function applyProjectThemeToPreviews(page: Page, testInfo: TestInfo) {
  const themeButtonName = projectTheme(testInfo) === "dark" ? "Dark theme" : "Light theme";
  const buttons = page.getByRole("button", { name: themeButtonName });
  const count = await buttons.count();

  for (let index = 0; index < count; index += 1) {
    await buttons.nth(index).click();
  }
}

async function previewContaining(page: Page, locator: Locator) {
  const preview = page.locator("#nd-page .not-prose").filter({ has: locator }).first();
  await expectStableVisualSurface(preview, { width: 220, height: 120 });
  return preview;
}

async function expectPreviewBoxStable(preview: Locator, action: () => Promise<void>) {
  await expectStableVisualSurface(preview, { width: 220, height: 120 });
  const before = await preview.boundingBox();
  expect(before, "preview should have a measurable box before interaction").not.toBeNull();

  await action();

  const after = await preview.boundingBox();
  expect(after, "preview should have a measurable box after interaction").not.toBeNull();
  expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeLessThanOrEqual(stableDeltaPx);
  expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(stableDeltaPx);
}

async function expectControlKeepsPreviewStable(
  page: Page,
  control: Locator,
  action: (control: Locator) => Promise<void>,
) {
  const preview = await previewContaining(page, control);
  await expectPreviewBoxStable(preview, () => action(control));
  await expectNoHorizontalOverflow(page, "#nd-page");
}

const longProjectName =
  "nebutra-primitive-state-matrix-long-text-overflow-check-2026-visual-acceptance";
const longNotes =
  "Primitive State Matrix visual acceptance checks a deliberately long sentence that should wrap inside the real textarea demo without widening the preview surface.";

const primitiveCases: PrimitiveCase[] = [
  {
    component: "button",
    route: "/en/docs/components/button",
    heading: /^Button$/,
    previewTextMinimum: 600,
    exercise: async (page) => {
      const defaultButton = page.getByRole("button", { name: /^Default$/ }).first();
      await expectControlKeepsPreviewStable(page, defaultButton, (control) => control.focus());
      await expect(defaultButton).toBeFocused();

      const loadingButton = page.getByRole("button", { name: /Saving|Loading/ }).last();
      await expect(loadingButton).toBeVisible();
      await expect(loadingButton).toBeDisabled();
    },
  },
  {
    component: "input",
    route: "/en/docs/components/input",
    heading: /^Input$/,
    previewTextMinimum: 900,
    exercise: async (page) => {
      const projectName = page.getByLabel("Project name").first();
      await expectControlKeepsPreviewStable(page, projectName, async (control) => {
        await control.focus();
        await control.fill(longProjectName);
      });
      await expect(projectName).toBeFocused();
      await expect(projectName).toHaveValue(longProjectName);

      const errorInput = page.getByLabel("Email Address").first();
      await expect(errorInput).toBeVisible();
      await expect(page.getByText("Email address must be valid.")).toBeVisible();
    },
  },
  {
    component: "textarea",
    route: "/en/docs/components/textarea",
    heading: /^Textarea$/,
    previewTextMinimum: 420,
    exercise: async (page) => {
      const message = page.getByLabel("Message").first();
      await expectControlKeepsPreviewStable(page, message, async (control) => {
        await control.focus();
        await control.fill(longNotes);
      });
      await expect(message).toBeFocused();
      await expect(message).toHaveValue(longNotes);

      const disabledTextarea = page.getByLabel("Disabled message");
      await expect(disabledTextarea).toBeVisible();
      await expect(disabledTextarea).toBeDisabled();
    },
  },
  {
    component: "select",
    route: "/en/docs/components/select",
    heading: /^Select$/,
    previewTextMinimum: 900,
    exercise: async (page) => {
      const trigger = page.locator("#framework-trigger").first();
      await expectControlKeepsPreviewStable(page, trigger, async (control) => {
        await control.focus();
        await control.click();
      });
      await expect(page.getByText("Frameworks", { exact: true })).toBeVisible();
      await expect(page.getByRole("option", { name: "Next.js" })).toBeVisible();

      await expect(page.getByText("Select a region.")).toBeVisible();
      const disabledSelect = page.locator("select:disabled").first();
      await expect(disabledSelect).toBeVisible();
    },
  },
];

test.describe("design-docs primitive state matrix visual acceptance", () => {
  for (const entry of primitiveCases) {
    test(`${entry.component} docs demo states stay stable`, async ({ page }, testInfo) => {
      await prepareVisualPage(page, `${DESIGN_DOCS_BASE_URL}${entry.route}`, testInfo, "#nd-page");
      await applyProjectThemeToPreviews(page, testInfo);

      const pageRoot = page.locator("#nd-page").first();
      await expect(page.getByRole("heading", { name: entry.heading, level: 1 })).toBeVisible();
      await expectStableVisualSurface(pageRoot, { width: 280, height: 500 });
      await expectVisibleTextDensity(pageRoot, entry.previewTextMinimum);
      await expectNoHorizontalOverflow(page, "#nd-page");

      await entry.exercise(page, testInfo);

      await expectNoHorizontalOverflow(page, "#nd-page");
      await attachViewportScreenshot(page, testInfo, `primitive-state-matrix-${entry.component}`);
    });
  }
});
