import path from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  BRANDS,
  type Brand,
  focusByKeyboard,
  formatOffenders,
  openAs,
  pressedState,
  previewOf,
  propsOf,
  radiusOf,
  readFocusState,
  SURFACE_PAGES,
  scanInteractiveTransitions,
  scanStaticSurfaces,
  scanToggleRows,
  setOverlayPhase,
  startOverlayRecorder,
  stopOverlayRecorder,
  THRESHOLDS,
} from "./support/visual-consensus";

/**
 * Visual consensus: the contract that keeps the docs site and the primitives from drifting
 * back to a wireframe. Every threshold is in `support/visual-consensus.ts` (THRESHOLDS).
 *
 * The default config pins `prefers-reduced-motion: reduce` so the older suites are
 * deterministic. Motion assertions here opt back in with `emulateMedia`.
 */

const desktopOnly = (name: string) => {
  test.skip(name !== "desktop", "Desktop geometry and interaction contract");
};

// ---------------------------------------------------------------------------
// 1. Static surfaces: hairline borders, no foreground-filled "selected blocks"
// ---------------------------------------------------------------------------

for (const scheme of ["light", "dark"] as const) {
  test.describe(`static surfaces (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    for (const brand of BRANDS) {
      for (const slug of SURFACE_PAGES) {
        test(`${brand} /components/${slug}: borders are hairlines and selection is not an ink block`, async ({
          page,
        }) => {
          await openAs(page, brand, `/components/${slug}`);
          const scan = await scanStaticSurfaces(page);
          // Guard against a vacuous pass: a real docs page paints far more than this.
          expect(scan.scanned, "elements inspected").toBeGreaterThan(40);
          expect.soft(scan.unresolved, "colours the probe could not resolve").toEqual([]);
          expect
            .soft(
              scan.borders.length,
              `heavy borders/rings/static outlines (border contrast <= ${THRESHOLDS.borderContrastMax}:1, width <= ${THRESHOLDS.borderWidthMax}px):\n${formatOffenders(scan.borders)}`,
            )
            .toBe(0);
          expect
            .soft(
              scan.fills.length,
              `foreground-coloured fills (channel distance <= ${THRESHOLDS.fillChannelDistanceMax}):\n${formatOffenders(scan.fills)}`,
            )
            .toBe(0);
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// 2. One control ladder: Button, Input, Combobox, Select share height and radius
// ---------------------------------------------------------------------------

interface LadderControl {
  control: string;
  slug: string;
  locate: (page: Page) => Locator;
  /** Option label per size step in the Props "size" segmented control. */
  sizes: Record<"sm" | "md" | "lg", string>;
}

const LADDER: LadderControl[] = [
  {
    control: "button",
    slug: "button",
    locate: (page) => previewOf(page).first().getByRole("button").first(),
    sizes: { sm: "sm", md: "default", lg: "lg" },
  },
  {
    control: "input",
    slug: "input",
    locate: (page) => previewOf(page).first().getByRole("textbox").first(),
    sizes: { sm: "sm", md: "md", lg: "lg" },
  },
  {
    control: "combobox",
    slug: "combobox",
    locate: (page) => previewOf(page).first().getByRole("combobox").first(),
    sizes: { sm: "small", md: "medium", lg: "large" },
  },
  {
    control: "select",
    slug: "select",
    locate: (page) => previewOf(page).first().getByRole("combobox").first(),
    sizes: { sm: "small", md: "medium", lg: "large" },
  },
];

for (const brand of BRANDS) {
  for (const size of ["sm", "md", "lg"] as const) {
    test(`${brand} ${size}: Button, Input, Combobox and Select share one height and one radius`, async ({
      page,
    }, testInfo) => {
      desktopOnly(testInfo.project.name);
      test.setTimeout(60_000);
      const measured: { control: string; height: number; radius: number }[] = [];
      for (const entry of LADDER) {
        await openAs(page, brand, `/components/${entry.slug}`);
        // Props options are a ToggleGroup of radios named after the prop.
        const option = propsOf(page)
          .getByRole("radiogroup", { name: "size", exact: true })
          .getByRole("radio", { name: entry.sizes[size], exact: true });
        await option.click();
        await expect(option).toBeChecked();
        const control = entry.locate(page);
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        if (!box) throw new Error(`${entry.control} must have a layout box`);
        measured.push({
          control: entry.control,
          height: box.height,
          radius: await radiusOf(control),
        });
      }
      const label = JSON.stringify(measured);
      const [reference] = measured;
      for (const item of measured) {
        expect(
          Math.abs(item.height - (reference?.height ?? 0)),
          `${item.control} height vs button at ${size}: ${label}`,
        ).toBeLessThanOrEqual(THRESHOLDS.heightTolerance);
        expect(item.radius, `${item.control} radius vs button at ${size}: ${label}`).toBe(
          reference?.radius,
        );
      }
    });
  }

  test(`${brand}: default controls are not pills (radius <= ${THRESHOLDS.controlRadiusMax}px)`, async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo.project.name);
    test.setTimeout(60_000);
    const measured: { control: string; radius: number }[] = [];
    for (const entry of LADDER) {
      await openAs(page, brand, `/components/${entry.slug}`);
      const control = entry.locate(page);
      await expect(control).toBeVisible();
      measured.push({ control: entry.control, radius: await radiusOf(control) });
    }
    const label = JSON.stringify(measured);
    for (const item of measured) {
      expect(item.radius, `${item.control} default radius: ${label}`).toBeLessThanOrEqual(
        THRESHOLDS.controlRadiusMax,
      );
    }
  });

  test(`${brand}: the playground frame is rounded, within ${THRESHOLDS.panelRadiusMax}px, and no tighter than the control radius (capped at ${THRESHOLDS.controlRadiusMax}px)`, async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo.project.name);
    await openAs(page, brand, "/components/input");
    const control = await radiusOf(previewOf(page).first().getByRole("textbox").first());
    // Preview, Code and Props live in one clipped workbench; the frame owns the radius.
    const frame = propsOf(page).locator("xpath=../..");
    await expect(frame.getByRole("group", { name: "Preview", exact: true })).toHaveCount(1);
    await expect(frame.locator("pre code").first()).toBeAttached();
    const radius = await radiusOf(frame);
    const label = JSON.stringify({ control, frame: radius });
    expect(radius, `frame must be rounded: ${label}`).toBeGreaterThan(0);
    expect(radius, `frame radius ceiling: ${label}`).toBeLessThanOrEqual(THRESHOLDS.panelRadiusMax);
    // Vanta controls are pills (999px); the floor is capped so they do not demand a 999px frame.
    expect(radius, `frame no tighter than the control: ${label}`).toBeGreaterThanOrEqual(
      Math.min(control, THRESHOLDS.controlRadiusMax),
    );
  });
}

// ---------------------------------------------------------------------------
// 3. Focus: one ring, keyboard only, radius never changes
// ---------------------------------------------------------------------------

interface FocusTarget {
  name: string;
  slug: string;
  locate: (page: Page) => Locator;
  /** "ring" = box-shadow ring + border recolour (text entry); "outline" = 2px/2px outline. */
  indicator: "ring" | "outline";
  /** Mouse click must not paint the ring (not true of text fields, which always match). */
  mouseHidesRing: boolean;
}

const FOCUS_TARGETS: FocusTarget[] = [
  {
    name: "input",
    slug: "input",
    locate: (page) => previewOf(page).first().getByRole("textbox").first(),
    indicator: "ring",
    mouseHidesRing: false,
  },
  {
    name: "button",
    slug: "button",
    locate: (page) => previewOf(page).first().getByRole("button").first(),
    indicator: "outline",
    mouseHidesRing: true,
  },
  {
    name: "combobox",
    slug: "combobox",
    locate: (page) => previewOf(page).first().getByRole("combobox").first(),
    indicator: "ring",
    mouseHidesRing: true,
  },
  {
    name: "select",
    slug: "select",
    locate: (page) => previewOf(page).first().getByRole("combobox").first(),
    indicator: "ring",
    mouseHidesRing: true,
  },
  {
    name: "tab",
    slug: "tabs",
    locate: (page) => previewOf(page).first().getByRole("tab").first(),
    indicator: "outline",
    mouseHidesRing: true,
  },
  {
    name: "nav link",
    slug: "button",
    locate: (page) =>
      page
        .getByRole("navigation", { name: "Sections", exact: true })
        .first()
        .getByRole("link")
        .first(),
    indicator: "outline",
    mouseHidesRing: false,
  },
];

for (const brand of BRANDS) {
  for (const target of FOCUS_TARGETS) {
    test(`${brand} ${target.name}: focus is keyboard-only, ${target.indicator === "ring" ? `a ${THRESHOLDS.focus.ringSpreadMin}-${THRESHOLDS.focus.ringSpreadMax}px ring plus a recoloured border` : `a ${THRESHOLDS.focus.width}px outline at ${THRESHOLDS.focus.offset}px offset`}, and keeps the radius`, async ({
      page,
    }, testInfo) => {
      desktopOnly(testInfo.project.name);
      await openAs(page, brand, `/components/${target.slug}`);
      const control = target.locate(page);
      await expect(control).toBeVisible();

      const rest = await readFocusState(control);
      expect(
        rest.outlineStyle === "none" || rest.outlineWidth === 0,
        `no outline at rest: ${JSON.stringify(rest)}`,
      ).toBe(true);
      expect(rest.shadowRing, `no ring at rest: ${JSON.stringify(rest)}`).toBe(0);

      await focusByKeyboard(page, control);
      // Let a colour/offset transition finish; its length is bounded by the motion contract.
      await page.waitForTimeout(THRESHOLDS.transitionMaxMs + 50);
      const focused = await readFocusState(control);
      const label = JSON.stringify({ rest, focused });
      expect(focused.focusVisible, `:focus-visible after keyboard focus: ${label}`).toBe(true);
      if (target.indicator === "ring") {
        expect(focused.shadowRing, `box-shadow ring spread: ${label}`).toBeGreaterThanOrEqual(
          THRESHOLDS.focus.ringSpreadMin,
        );
        expect(focused.shadowRing, `box-shadow ring spread: ${label}`).toBeLessThanOrEqual(
          THRESHOLDS.focus.ringSpreadMax,
        );
        expect(focused.borderColor, `border recolours on focus: ${label}`).not.toBe(
          rest.borderColor,
        );
        expect(focused.borderWidth, `border width must not change on focus: ${label}`).toBe(
          rest.borderWidth,
        );
        expect(
          focused.borderContrast,
          `focused border contrast vs surface: ${label}`,
        ).toBeGreaterThanOrEqual(THRESHOLDS.focus.contrastMin);
        // One indicator, not a ring on top of an outline.
        expect(
          focused.outlineStyle === "none" || focused.outlineWidth === 0,
          `no outline alongside the ring: ${label}`,
        ).toBe(true);
      } else {
        expect(focused.outlineStyle, label).toBe(THRESHOLDS.focus.style);
        expect(focused.outlineWidth, label).toBe(THRESHOLDS.focus.width);
        expect(focused.outlineOffset, label).toBe(THRESHOLDS.focus.offset);
        expect(focused.ringContrast, `ring contrast vs surface: ${label}`).toBeGreaterThanOrEqual(
          THRESHOLDS.focus.contrastMin,
        );
      }
      expect(focused.radius, `border-radius must not change on focus: ${label}`).toBe(rest.radius);

      if (target.mouseHidesRing) {
        await page.keyboard.press("Escape");
        await control.evaluate((el) => (el as HTMLElement).blur());
        await control.click();
        await page.waitForTimeout(THRESHOLDS.transitionMaxMs + 50);
        const clicked = await readFocusState(control);
        expect(
          clicked.focusVisible || clicked.outlineStyle !== "none" || clicked.shadowRing > 0,
          `pointer focus must not draw the ring: ${JSON.stringify(clicked)}`,
        ).toBe(false);
        expect(
          clicked.borderColor,
          `pointer focus must not recolour the border: ${JSON.stringify(clicked)}`,
        ).toBe(rest.borderColor);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Interactive motion: named properties, short, ease-out, pressed feedback
// ---------------------------------------------------------------------------

for (const brand of BRANDS) {
  for (const slug of SURFACE_PAGES) {
    test(`${brand} /components/${slug}: every control transitions named properties, under ${THRESHOLDS.transitionMaxMs}ms, ease-out`, async ({
      page,
    }, testInfo) => {
      desktopOnly(testInfo.project.name);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await openAs(page, brand, `/components/${slug}`);
      const scan = await scanInteractiveTransitions(page);
      expect(scan.scanned, "interactive elements inspected").toBeGreaterThan(10);
      expect(scan.offenders.length, formatOffenders(scan.offenders)).toBe(0);
    });
  }

  test(`${brand}: pressing a Button scales it to ~0.97 through a transitioned property`, async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo.project.name);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const pressed: Record<string, Awaited<ReturnType<typeof pressedState>>> = {};
    await openAs(page, brand, "/components/button");
    pressed.previewButton = await pressedState(
      page,
      previewOf(page).first().getByRole("button").first(),
    );
    await openAs(page, brand, "/components/input");
    pressed.showCode = await pressedState(
      page,
      page.getByRole("button", { name: "Show code" }).first(),
    );
    pressed.copyInstall = await pressedState(
      page,
      page.getByRole("button", { name: "Copy install command" }),
    );
    const label = JSON.stringify(pressed);
    for (const [name, state] of Object.entries(pressed)) {
      expect(state.scale, `${name} pressed scale: ${label}`).toBeGreaterThanOrEqual(
        THRESHOLDS.pressScale.min,
      );
      expect(state.scale, `${name} pressed scale: ${label}`).toBeLessThanOrEqual(
        THRESHOLDS.pressScale.max,
      );
      expect(
        state.transitionsScale,
        `${name} must transition transform/scale or the press snaps: ${label}`,
      ).toBe(true);
    }
  });
}

// ---------------------------------------------------------------------------
// 5. prefers-reduced-motion: nothing moves
// ---------------------------------------------------------------------------

for (const brand of BRANDS) {
  for (const slug of SURFACE_PAGES) {
    test(`${brand} /components/${slug}: reduced motion leaves no transform animation, transition or drift`, async ({
      page,
    }, testInfo) => {
      desktopOnly(testInfo.project.name);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openAs(page, brand, `/components/${slug}`);
      await page.waitForLoadState("networkidle");

      const moving = await page.evaluate(() => {
        const transformish = new Set(["transform", "translate", "scale", "rotate", "offsetPath"]);
        const out: string[] = [];
        for (const anim of document.getAnimations()) {
          if (anim.playState !== "running") continue;
          const effect = anim.effect as KeyframeEffect | null;
          const keys = new Set(
            (effect?.getKeyframes() ?? []).flatMap((frame) => Object.keys(frame)),
          );
          const hit = [...keys].filter((key) => transformish.has(key));
          if (hit.length) {
            const target = effect?.target as Element | null;
            const cls = (target?.getAttribute("class") ?? "").slice(0, 60);
            out.push(`${target?.tagName.toLowerCase()}.${cls} animates ${hit.join("/")}`);
          }
        }
        return out;
      });
      expect(moving, "running transform animations").toEqual([]);

      const transitions = await page.evaluate(() => {
        const out: string[] = [];
        const selector =
          'button, a[href], input:not([type="hidden"]), [role="tab"], [role="switch"], [role="combobox"], [role="checkbox"], [role="radio"]';
        for (const el of document.querySelectorAll(selector)) {
          const cs = getComputedStyle(el);
          const props = cs.transitionProperty.split(",").map((p) => p.trim());
          const spans = cs.transitionDuration.split(",").map((d) => Number.parseFloat(d));
          const hit = props.some(
            (p, i) =>
              (spans[i % spans.length] ?? 0) > 0 &&
              ["all", "transform", "translate", "scale", "rotate"].includes(p),
          );
          if (hit) {
            const r = el.getBoundingClientRect();
            if (r.width >= 2 && r.height >= 2) {
              out.push(
                `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 20)}" ${cs.transitionProperty}`,
              );
            }
          }
        }
        return out;
      });
      expect(transitions, "transform transitions that survive reduced motion").toEqual([]);

      if (slug === "button" || slug === "input") {
        const target =
          slug === "button"
            ? previewOf(page).first().getByRole("button").first()
            : page.getByRole("button", { name: "Show code" }).first();
        const pressed = await pressedState(page, target);
        expect(pressed.scale, "pressed scale under reduced motion").toBe(1);
      }

      // Nothing may drift: the same boxes, 600ms apart, once lazy content has settled.
      const snapshot = () =>
        page.evaluate(() =>
          [...document.querySelectorAll("main *")]
            .map((el) => {
              const r = el.getBoundingClientRect();
              return r.width < 2 || r.height < 2
                ? null
                : [
                    el.tagName,
                    Math.round(r.x * 2) / 2,
                    Math.round(r.y * 2) / 2,
                    Math.round(r.width * 2) / 2,
                    Math.round(r.height * 2) / 2,
                  ];
            })
            .filter((row) => row !== null),
        );
      let settled = await snapshot();
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await page.waitForTimeout(300);
        const next = await snapshot();
        const stable = next.length === settled.length;
        settled = next;
        if (stable) break;
      }
      const first = settled;
      await page.waitForTimeout(600);
      const second = await snapshot();
      expect(second.length, "element count is stable").toBe(first.length);
      const drifted = first
        .map((row, i) => ({ row, now: second[i] }))
        .filter(({ row, now }) => JSON.stringify(row) !== JSON.stringify(now))
        .slice(0, 8);
      expect(drifted, "boxes that moved under reduced motion").toEqual([]);
    });
  }
}

// ---------------------------------------------------------------------------
// 6. Overlays: enter and exit from the trigger, never from nothing
// ---------------------------------------------------------------------------

interface OverlayCase {
  name: string;
  slug: string;
  /** Elements that signal the popup is open. */
  ready: string;
  /** Roots the recorder scans for animations; the Base UI portal covers popups with no role. */
  selector: string;
  open: (page: Page) => Promise<void>;
  close: (page: Page) => Promise<void>;
}

const triggerOf = (page: Page) => previewOf(page).first().getByRole("button").first();
const pressEscape = (page: Page) => page.keyboard.press("Escape");
const PORTAL = "[data-base-ui-portal]";

const OVERLAYS: OverlayCase[] = [
  {
    name: "popover",
    slug: "popover",
    ready: '[role="dialog"]',
    selector: `${PORTAL}, [role="dialog"]`,
    open: (page) => triggerOf(page).click(),
    close: pressEscape,
  },
  {
    name: "menu",
    slug: "dropdown-menu",
    ready: '[role="menu"]',
    selector: `${PORTAL}, [role="menu"]`,
    open: (page) => triggerOf(page).click(),
    close: pressEscape,
  },
  {
    name: "combobox",
    slug: "combobox",
    ready: '[role="listbox"]',
    selector: `${PORTAL}, [role="listbox"], [role="dialog"]`,
    open: (page) => previewOf(page).first().getByRole("combobox").first().click(),
    close: pressEscape,
  },
  {
    name: "select",
    slug: "select",
    ready: '[role="listbox"]',
    selector: `${PORTAL}, [role="listbox"]`,
    open: (page) => previewOf(page).first().getByRole("combobox").first().click(),
    close: pressEscape,
  },
  {
    name: "tooltip",
    slug: "tooltip",
    ready: `${PORTAL} [data-open], [role="tooltip"]`,
    selector: `${PORTAL}, [role="tooltip"]`,
    // Hovering before React hydrates is a silent no-op, so retry the hover until the
    // popup appears instead of racing the page load.
    open: (page) =>
      expect(async () => {
        await page.mouse.move(0, 0);
        await triggerOf(page).hover();
        await expect(page.locator(`${PORTAL} [data-open]`).first()).toBeAttached({
          timeout: 2_000,
        });
      }).toPass({ timeout: 12_000 }),
    close: async (page) => {
      await page.mouse.move(0, 0);
      await pressEscape(page);
    },
  },
];

for (const brand of BRANDS) {
  for (const overlay of OVERLAYS) {
    test(`${brand} ${overlay.name}: enters and exits with motion that starts >= ${THRESHOLDS.overlayScaleMin} and originates at the trigger`, async ({
      page,
    }, testInfo) => {
      desktopOnly(testInfo.project.name);
      test.setTimeout(60_000);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await openAs(page, brand, `/components/${overlay.slug}`);

      await startOverlayRecorder(page, overlay.selector);
      await overlay.open(page);
      await expect(page.locator(overlay.ready).first()).toBeAttached({ timeout: 5_000 });
      await page.waitForTimeout(700);
      await setOverlayPhase(page, "exit");
      await overlay.close(page);
      await page.waitForTimeout(700);
      const samples = await stopOverlayRecorder(page);
      await testInfo.attach(`${brand}-${overlay.name}-animations`, {
        body: JSON.stringify(samples, null, 2),
        contentType: "application/json",
      });

      for (const phase of ["enter", "exit"] as const) {
        const motion = samples.filter((sample) => sample.phase === phase);
        const label = JSON.stringify(motion);
        expect(
          motion.length,
          `${overlay.name} must animate its ${phase} with CSS/WAAPI (none observed): ${label}`,
        ).toBeGreaterThan(0);
        for (const sample of motion) {
          expect(sample.durationMs, `${phase} duration: ${label}`).toBeGreaterThan(0);
          expect(sample.durationMs, `${phase} duration: ${label}`).toBeLessThanOrEqual(
            THRESHOLDS.transitionMaxMs,
          );
          // Enter starts small and ends at 1; exit starts at 1 and ends small.
          const smallest = phase === "enter" ? sample.startScale : sample.endScale;
          expect(smallest, `${phase} scale extreme: ${label}`).toBeGreaterThanOrEqual(
            THRESHOLDS.overlayScaleMin,
          );
          if (smallest < 1) {
            const [ox, oy] = sample.origin;
            const [w, h] = sample.size;
            const centred = Math.abs(ox - w / 2) < 0.5 && Math.abs(oy - h / 2) < 0.5;
            expect(centred, `${phase} transform-origin is centred: ${label}`).toBe(false);
          }
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 7. After screenshots (set DESIGN_SCREENSHOT_DIR to capture)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Switches: an off switch is still a control (3:1), untinted, in one column
// ---------------------------------------------------------------------------

for (const scheme of ["light", "dark"] as const) {
  test.describe(`boolean switches (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    for (const brand of BRANDS) {
      for (const slug of ["badge", "input", "button"]) {
        test(`${brand} /components/${slug}: off switches are visible, untinted and aligned`, async ({
          page,
        }, testInfo) => {
          desktopOnly(testInfo.project.name);
          await openAs(page, brand, `/components/${slug}`);
          const { rows } = await scanToggleRows(page);
          expect(rows.length, "unchecked switches in the playground").toBeGreaterThan(0);
          for (const row of rows) {
            expect
              .soft(row.fillContrast, `${row.label}: off track vs surface`)
              .toBeGreaterThanOrEqual(3);
            expect
              .soft(row.thumbContrast, `${row.label}: thumb vs off track`)
              .toBeGreaterThanOrEqual(3);
            expect.soft(row.borderAlpha, `${row.label}: off track has no outline tint`).toBe(0);
            expect
              .soft(row.trackLeft - row.labelRight, `${row.label}: label and switch do not touch`)
              .toBeGreaterThanOrEqual(4);
          }
          const rights = rows.map((row) => Math.round(row.trackRight));
          expect(new Set(rights).size, `switch right edges ${rights.join(", ")}`).toBe(1);
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Logo ink: the manual ships single-ink SVGs; the page decides which ink shows
// ---------------------------------------------------------------------------

for (const scheme of ["light", "dark"] as const) {
  test.describe(`brand logos (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    for (const brand of BRANDS) {
      test(`${brand} /brand: every solid logo ink is legible on its stage`, async ({ page }) => {
        await openAs(page, brand, "/brand");
        const logos = await page.evaluate(() => {
          type Rgb = [number, number, number];
          const canvas = document.createElement("canvas");
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("canvas 2d unavailable");
          const over = (css: string, base: Rgb): Rgb => {
            ctx.fillStyle = `rgb(${base[0]} ${base[1]} ${base[2]})`;
            ctx.fillRect(0, 0, 1, 1);
            ctx.fillStyle = css;
            ctx.fillRect(0, 0, 1, 1);
            const px = ctx.getImageData(0, 0, 1, 1).data;
            return [px[0] ?? 0, px[1] ?? 0, px[2] ?? 0];
          };
          const lum = ([r, g, b]: Rgb) => {
            const lin = (v: number) => {
              const c = v / 255;
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
          };
          const ratio = (a: Rgb, b: Rgb) => {
            const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
            return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
          };
          const root: Rgb = document.documentElement.classList.contains("dark")
            ? [0, 0, 0]
            : [255, 255, 255];
          const surface = (el: Element | null): Rgb => {
            if (!el) return root;
            const parent = surface(el.parentElement);
            const bg = getComputedStyle(el).backgroundColor;
            return bg === "rgba(0, 0, 0, 0)" || bg === "transparent" ? parent : over(bg, parent);
          };
          return [...document.querySelectorAll("main svg[role=img]")].map((svg, index) => {
            const stage = surface(svg.parentElement);
            const inks = [...svg.querySelectorAll("path, polygon, rect, circle")]
              // Clip and gradient geometry is never painted.
              .filter((shape) => !shape.closest("defs, clipPath, mask"))
              .map((shape) => getComputedStyle(shape).fill)
              .filter((fill) => fill !== "none" && !fill.startsWith("url("));
            const worst = inks.reduce(
              (min, fill) => Math.min(min, ratio(over(fill, stage), stage)),
              Number.POSITIVE_INFINITY,
            );
            return { index, solidShapes: inks.length, worst: Math.round(worst * 100) / 100 };
          });
        });
        expect(logos.length, "inline logos on the page").toBeGreaterThanOrEqual(4);
        for (const logo of logos) {
          if (logo.solidShapes === 0) continue;
          expect
            .soft(logo.worst, `logo #${logo.index}: solid ink vs its stage`)
            .toBeGreaterThanOrEqual(3);
        }
      });
    }
  });
}

const SHOT_DIR = process.env.DESIGN_SCREENSHOT_DIR;

test.describe("after screenshots", () => {
  test.skip(!SHOT_DIR, "Set DESIGN_SCREENSHOT_DIR to capture the after-*.png set");

  for (const brand of BRANDS) {
    for (const slug of SURFACE_PAGES) {
      test(`${brand} /components/${slug}`, async ({ page }, testInfo) => {
        const variants: ("light" | "dark" | "mobile")[] =
          testInfo.project.name === "mobile" ? ["mobile"] : ["light", "dark"];
        for (const variant of variants) {
          await page.emulateMedia({
            colorScheme: variant === "dark" ? "dark" : "light",
            reducedMotion: "reduce",
          });
          await openAs(page, brand as Brand, `/components/${slug}`);
          await page.waitForLoadState("networkidle");
          const stem = path.join(SHOT_DIR ?? "", `after-${brand}-${slug}-${variant}`);
          await page.screenshot({ path: `${stem}.png` });
          const playground = page.locator("#playground");
          if (await playground.count()) {
            await playground.scrollIntoViewIfNeeded();
            await playground.screenshot({ path: `${stem}-playground.png` });
          }
        }
      });
    }
  }
});
