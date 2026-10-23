import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared probes for the visual-consensus suite.
 *
 * Every number the suite enforces lives in THRESHOLDS so a reviewer can read the whole
 * contract in one place. They are the 2026 consensus (Geist / Arco / Radix) and are not
 * to be loosened to make a failing surface pass: change the surface instead.
 */
export const THRESHOLDS = {
  /** WCAG 1.4.11 asks 3:1 for a control boundary; anything heavier than that is a wireframe. */
  borderContrastMax: 3,
  /** Hairline. Box borders never exceed 1 CSS px. */
  borderWidthMax: 1,
  /** A single-side bar (tab underline, TOC rail) is an indicator, not an outline. */
  indicatorWidthMax: 3,
  /** Selected/solid fill is "foreground-coloured" when every RGB channel is this close. */
  fillChannelDistanceMax: 24,
  /** Smaller than this (px^2) is a dot/thumb/glyph, not a block. */
  fillMinArea: 600,
  /** A bar thinner than this is a rule or progress track, not a block. */
  fillMinSide: 16,
  /** Swatches, bullets and status dots up to this size are glyphs: their ring is the glyph. */
  glyphMaxSide: 12,
  /** UI transitions stay under this, in ms (Emil Kowalski / Material "standard" ceiling). */
  transitionMaxMs: 300,
  /** Overlay enter/exit may not start from a smaller scale than this. */
  overlayScaleMin: 0.96,
  /**
   * Keyboard focus. Buttons, tabs and links draw a 2px/2px outline. Text-entry controls
   * (Input, Combobox, Select) draw a box-shadow ring and recolour the border instead, so the
   * ring never fights the field's own edge. Both forms need 3:1 against the surface.
   */
  focus: {
    width: 2,
    style: "solid",
    offset: 2,
    contrastMin: 3,
    ringSpreadMin: 2,
    ringSpreadMax: 4,
  },
  /** Pressed feedback band around scale(0.97). */
  pressScale: { min: 0.95, max: 0.99 },
  /** Height tolerance between control types at the same size, in px. */
  heightTolerance: 0.5,
  /** Default (non-pill) control and panel radii, in px. */
  controlRadiusMax: 12,
  panelRadiusMax: 20,
} as const;

export const BRANDS = ["factory", "vanta"] as const;
export type Brand = (typeof BRANDS)[number];

/** The four surfaces the issue is about. */
export const SURFACE_PAGES = ["input", "button", "combobox", "tabs"] as const;

/**
 * Pins the design language before the document boots. The boot script reads this
 * sessionStorage key, so the first paint is already in the language under test.
 */
export async function openAs(page: Page, brand: Brand, path: string) {
  await page.addInitScript((value: string) => {
    if (value === "factory") sessionStorage.removeItem("nebutra.design.brand");
    else sessionStorage.setItem("nebutra.design.brand", value);
  }, brand);
  const response = await page.goto(path);
  expect(response?.status(), `${path} must render`).toBe(200);
  if (brand === "factory") {
    const attr = await page.locator("html").getAttribute("data-brand");
    expect([null, "factory"], `data-brand on Factory was ${attr}`).toContain(attr);
  } else {
    await expect(page.locator("html")).toHaveAttribute("data-brand", brand);
  }
  await page.evaluate(() => document.fonts.ready);
  // Park the pointer where nothing lives so no control renders its hover state.
  await page.mouse.move(0, 0);
}

export const previewOf = (page: Page) => page.getByRole("group", { name: "Preview", exact: true });
export const propsOf = (page: Page) =>
  page.getByRole("complementary", { name: "Props", exact: true });

export async function focusByKeyboard(page: Page, target: Locator) {
  await target.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(target).toBeFocused();
}

export interface Offender {
  what: string;
  where: string;
  detail: string;
}

export interface StaticScan {
  scanned: number;
  unresolved: string[];
  borders: Offender[];
  fills: Offender[];
}

/**
 * One in-page pass over every painted element: border contrast/width, ring-style
 * box-shadows, static outlines, and foreground-coloured fills. Colours are resolved
 * through a canvas so oklch/oklab/color-mix compare as the pixels they become.
 */
export async function scanStaticSurfaces(page: Page): Promise<StaticScan> {
  return page.evaluate((t) => {
    type Rgb = [number, number, number];
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("canvas 2d unavailable");
    const unresolved = new Set<string>();
    const cache = new Map<string, Rgb>();
    const SENTINEL = "#ff00ff";
    const over = (css: string, base: Rgb): Rgb => {
      const key = `${css}|${base.join(",")}`;
      const hit = cache.get(key);
      if (hit) return hit;
      ctx.fillStyle = `rgb(${base[0]} ${base[1]} ${base[2]})`;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = SENTINEL;
      ctx.fillStyle = css;
      if (ctx.fillStyle === SENTINEL) {
        unresolved.add(css);
        cache.set(key, base);
        return base;
      }
      ctx.fillRect(0, 0, 1, 1);
      const px = ctx.getImageData(0, 0, 1, 1).data;
      const value: Rgb = [px[0] ?? 0, px[1] ?? 0, px[2] ?? 0];
      cache.set(key, value);
      return value;
    };
    const luminance = ([r, g, b]: Rgb) => {
      const lin = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const ratio = (a: Rgb, b: Rgb) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
    };
    const same = (a: Rgb, b: Rgb) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

    const root = document.documentElement;
    const rootBase: Rgb = root.classList.contains("dark") ? [0, 0, 0] : [255, 255, 255];
    const surfaces = new WeakMap<Element, Rgb>();
    const surface = (el: Element | null): Rgb => {
      if (!el) return rootBase;
      const hit = surfaces.get(el);
      if (hit) return hit;
      const parent = surface(el.parentElement);
      const bg = getComputedStyle(el).backgroundColor;
      const value = bg === "rgba(0, 0, 0, 0)" || bg === "transparent" ? parent : over(bg, parent);
      surfaces.set(el, value);
      return value;
    };
    const foreground = over(getComputedStyle(document.body).color, surface(document.body));

    const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IMG", "VIDEO", "CANVAS", "IFRAME"]);
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const probe = el as HTMLElement & {
        checkVisibility?: (options: Record<string, boolean>) => boolean;
      };
      return typeof probe.checkVisibility === "function"
        ? probe.checkVisibility({
            checkOpacity: true,
            opacityProperty: true,
            checkVisibilityCSS: true,
            visibilityProperty: true,
          })
        : true;
    };
    const describe = (el: Element) => {
      const r = el.getBoundingClientRect();
      const label = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24);
      const role = el.getAttribute("role");
      const slot = (el as HTMLElement).dataset?.slot;
      return `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}${slot ? `[slot=${slot}]` : ""} "${label}" @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    };
    const splitTop = (value: string) => {
      const parts: string[] = [];
      let depth = 0;
      let current = "";
      for (const ch of value) {
        if (ch === "(") depth += 1;
        if (ch === ")") depth -= 1;
        if (ch === "," && depth === 0) {
          parts.push(current.trim());
          current = "";
        } else current += ch;
      }
      if (current.trim()) parts.push(current.trim());
      return parts;
    };

    const selectedSelector = [
      '[aria-pressed="true"]',
      '[aria-selected="true"]',
      '[aria-current]:not([aria-current="false"])',
      '[data-state="on"]',
      '[data-state="active"]',
      '[data-state="selected"]',
    ].join(",");
    const interactiveSelector =
      'button, a, input, select, textarea, label, [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], pre, figure';

    const borders: { what: string; where: string; detail: string }[] = [];
    const fills: { what: string; where: string; detail: string }[] = [];
    let scanned = 0;

    for (const el of document.body.querySelectorAll("*")) {
      if (skipTags.has(el.tagName) || el instanceof SVGElement || !visible(el)) continue;
      scanned += 1;
      const cs = getComputedStyle(el);
      const own = surface(el);
      const outer = surface(el.parentElement);
      const where = describe(el);

      // Box borders.
      const sides: { side: string; width: number; color: string }[] = [];
      for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
        const width = Number.parseFloat(cs[`border${side}Width`]);
        const style = cs[`border${side}Style`];
        if (width > 0 && style !== "none" && style !== "hidden") {
          sides.push({ side, width, color: cs[`border${side}Color`] });
        }
      }
      const box = el.getBoundingClientRect();
      const glyph = box.width <= t.glyphMaxSide && box.height <= t.glyphMaxSide;
      // An error state is allowed to be loud; it is semantic colour, not chrome.
      const semantic = el.matches('[aria-invalid="true"], [data-invalid="true"]');
      // One report per distinct colour/width, listing the sides it covers.
      const grouped = new Map<string, { sides: string[]; detail: string; what: string }>();
      for (const { side, width, color } of glyph ? [] : sides) {
        const indicator = sides.length === 1 && width >= 2;
        // A switch track is the control's only boundary; WCAG 1.4.11 asks it for >= 3:1, so the
        // "not heavier than 3:1" cap cannot apply to it. Width is still capped below. The track is
        // either the role=switch element or the wide aria-hidden span painted after a peer
        // checkbox input (checkbox boxes are square, so they stay under the cap).
        const trackBoundary =
          el.matches('[role="switch"]') ||
          (el.matches('[aria-hidden="true"]') &&
            Boolean(
              el.previousElementSibling?.matches('input[type="checkbox"], [role="switch"]'),
            ) &&
            box.width >= box.height * 1.5);
        const painted = over(color, own);
        const contrast = Math.max(ratio(painted, own), ratio(painted, outer));
        if (!indicator && !semantic && !trackBoundary && contrast > t.borderContrastMax) {
          const key = `contrast|${color}`;
          const entry = grouped.get(key) ?? {
            sides: [],
            what: "border-contrast",
            detail: `${color} = ${contrast.toFixed(2)}:1 > ${t.borderContrastMax}:1`,
          };
          entry.sides.push(side[0] ?? "");
          grouped.set(key, entry);
        }
        const limit = indicator ? t.indicatorWidthMax : t.borderWidthMax;
        if (width > limit) {
          const key = `width|${width}`;
          const entry = grouped.get(key) ?? {
            sides: [],
            what: "border-width",
            detail: `${width}px > ${limit}px`,
          };
          entry.sides.push(side[0] ?? "");
          grouped.set(key, entry);
        }
      }
      for (const entry of grouped.values()) {
        borders.push({
          what: entry.what,
          where,
          detail: `[${entry.sides.join("")}] ${entry.detail}`,
        });
      }

      // Ring-style box-shadow (0 0 0 Npx colour) is a border in disguise.
      if (cs.boxShadow && cs.boxShadow !== "none") {
        for (const shadow of splitTop(cs.boxShadow)) {
          const lengths = [...shadow.matchAll(/-?\d*\.?\d+px/g)].map((m) =>
            Number.parseFloat(m[0]),
          );
          const color = shadow
            .replace(/-?\d*\.?\d+px/g, "")
            .replace(/\binset\b/, "")
            .trim();
          const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
          if (!glyph && !semantic && x === 0 && y === 0 && blur === 0 && spread > 0 && color) {
            const painted = over(color, own);
            const contrast = Math.max(ratio(painted, own), ratio(painted, outer));
            if (contrast > t.borderContrastMax) {
              borders.push({
                what: "ring-contrast",
                where,
                detail: `${shadow} = ${contrast.toFixed(2)}:1 > ${t.borderContrastMax}:1`,
              });
            }
            if (spread > t.indicatorWidthMax) {
              borders.push({ what: "ring-width", where, detail: `${spread}px` });
            }
          }
        }
      }

      // Outlines belong to :focus-visible only.
      if (
        cs.outlineStyle !== "none" &&
        Number.parseFloat(cs.outlineWidth) > 0 &&
        !el.matches(":focus-visible")
      ) {
        borders.push({
          what: "static-outline",
          where,
          detail: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
        });
      }

      // Foreground-coloured fills.
      if (!same(own, outer)) {
        const distance = Math.max(
          Math.abs(own[0] - foreground[0]),
          Math.abs(own[1] - foreground[1]),
          Math.abs(own[2] - foreground[2]),
        );
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        const selected = el.matches(selectedSelector);
        const bare = !el.closest(interactiveSelector);
        const block =
          bare && area >= t.fillMinArea && Math.min(rect.width, rect.height) >= t.fillMinSide;
        if (distance <= t.fillChannelDistanceMax && (selected || block)) {
          fills.push({
            what: selected ? "selected-fill" : "block-fill",
            where,
            detail: `rgb(${own.join(",")}) vs foreground rgb(${foreground.join(",")})`,
          });
        }
      }
    }
    return { scanned, unresolved: [...unresolved], borders, fills };
  }, THRESHOLDS);
}

export interface MotionScan {
  scanned: number;
  offenders: Offender[];
}

/** Every interactive element must transition named properties, briefly, with an ease-out. */
export async function scanInteractiveTransitions(page: Page): Promise<MotionScan> {
  return page.evaluate((t) => {
    const selector =
      'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="combobox"], [role="menuitem"]';
    const toMs = (value: string) =>
      value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
    const splitTop = (value: string) => {
      const parts: string[] = [];
      let depth = 0;
      let current = "";
      for (const ch of value) {
        if (ch === "(") depth += 1;
        if (ch === ")") depth -= 1;
        if (ch === "," && depth === 0) {
          parts.push(current.trim());
          current = "";
        } else current += ch;
      }
      if (current.trim()) parts.push(current.trim());
      return parts;
    };
    const offenders: { what: string; where: string; detail: string }[] = [];
    let scanned = 0;
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      scanned += 1;
      const cs = getComputedStyle(el);
      const label = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24);
      const role = el.getAttribute("role");
      const where = `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ""} "${label}" @${Math.round(r.x)},${Math.round(r.y)}`;
      const properties = splitTop(cs.transitionProperty);
      const durations = splitTop(cs.transitionDuration).map(toMs);
      const easings = splitTop(cs.transitionTimingFunction);
      // `all 0s` is the browser default, i.e. the element declares no transition at all.
      if (properties.every((p) => p === "none" || durations.every((d) => !(d > 0)))) {
        offenders.push({
          what: "no-transition",
          where,
          detail: `${cs.transitionProperty} ${cs.transitionDuration}`,
        });
        continue;
      }
      if (properties.includes("all")) {
        offenders.push({ what: "transition-all", where, detail: cs.transitionProperty });
      }
      if (durations.some((d) => !(d > 0))) {
        offenders.push({ what: "zero-duration", where, detail: cs.transitionDuration });
      }
      if (durations.some((d) => d > t.transitionMaxMs)) {
        offenders.push({
          what: "too-slow",
          where,
          detail: `${cs.transitionDuration} > ${t.transitionMaxMs}ms`,
        });
      }
      if (
        easings.some(
          (e) => e === "linear" || e === "ease-in" || e === "cubic-bezier(0.42, 0, 1, 1)",
        )
      ) {
        offenders.push({ what: "bad-easing", where, detail: cs.transitionTimingFunction });
      }
    }
    return { scanned, offenders };
  }, THRESHOLDS);
}

export interface AnimationSample {
  phase: "enter" | "exit";
  target: string;
  properties: string[];
  durationMs: number;
  delayMs: number;
  startScale: number;
  endScale: number;
  startOpacity: number;
  endOpacity: number;
  origin: [number, number];
  size: [number, number];
}

/**
 * Starts a frame-by-frame recorder for overlay animations. It does not rely on catching
 * a screenshot mid-flight: each CSS/WAAPI animation that appears under a matching popup
 * is rewound to its first and last frame and the computed style there is read.
 */
export async function startOverlayRecorder(page: Page, selector: string) {
  await page.evaluate((popupSelector) => {
    const win = window as unknown as { __overlayRec?: unknown };
    const seen = new WeakSet<Animation>();
    const rec = {
      phase: "enter" as "enter" | "exit",
      samples: [] as Record<string, unknown>[],
      raf: 0,
      stopped: false,
    };
    const motionProps = new Set(["opacity", "transform", "scale", "translate", "rotate"]);
    const scaleOf = (cs: CSSStyleDeclaration) => {
      let matrix = 1;
      const m = cs.transform.match(/^matrix(3d)?\((.+)\)$/);
      if (m?.[2]) {
        const v = m[2].split(",").map(Number);
        matrix = m[1]
          ? Math.min(
              Math.hypot(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0),
              Math.hypot(v[4] ?? 0, v[5] ?? 0, v[6] ?? 0),
            )
          : Math.min(Math.hypot(v[0] ?? 0, v[1] ?? 0), Math.hypot(v[2] ?? 0, v[3] ?? 0));
      }
      const prop = cs.scale && cs.scale !== "none" ? Number.parseFloat(cs.scale) : 1;
      return matrix * prop;
    };
    const readAt = (anim: Animation, time: number, target: HTMLElement) => {
      const before = anim.currentTime;
      const wasRunning = anim.playState === "running";
      anim.pause();
      anim.currentTime = time;
      const cs = getComputedStyle(target);
      const out = { scale: scaleOf(cs), opacity: Number(cs.opacity), origin: cs.transformOrigin };
      anim.currentTime = before;
      if (wasRunning) anim.play();
      return out;
    };
    const tick = () => {
      if (rec.stopped) return;
      for (const root of document.querySelectorAll(popupSelector)) {
        const scope = root.closest("[data-radix-popper-content-wrapper]") ?? root;
        for (const anim of scope.getAnimations({ subtree: true })) {
          if (seen.has(anim)) continue;
          seen.add(anim);
          const effect = anim.effect as KeyframeEffect | null;
          const target = effect?.target;
          if (!effect || !(target instanceof HTMLElement)) continue;
          // A full-viewport backdrop fading in is not the popup's own motion.
          if (
            target.offsetWidth >= window.innerWidth * 0.9 &&
            target.offsetHeight >= window.innerHeight * 0.9
          ) {
            continue;
          }
          const properties = new Set<string>();
          for (const keyframe of effect.getKeyframes()) {
            for (const key of Object.keys(keyframe)) {
              if (!["offset", "computedOffset", "easing", "composite"].includes(key)) {
                properties.add(key);
              }
            }
          }
          if (![...properties].some((p) => motionProps.has(p))) continue;
          const timing = effect.getComputedTiming();
          const duration = typeof timing.duration === "number" ? timing.duration : 0;
          const delay = Number(timing.delay ?? 0);
          const first = readAt(anim, delay + 0.1, target);
          const last = readAt(anim, Math.max(delay, delay + duration - 0.1), target);
          const [ox = 0, oy = 0] = first.origin.split(" ").map((v) => Number.parseFloat(v));
          const role = target.getAttribute("role");
          rec.samples.push({
            phase: rec.phase,
            target: `${target.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}[data-state=${target.getAttribute("data-state") ?? ""}]`,
            properties: [...properties],
            durationMs: duration,
            delayMs: delay,
            startScale: first.scale,
            endScale: last.scale,
            startOpacity: first.opacity,
            endOpacity: last.opacity,
            origin: [ox, oy],
            size: [target.offsetWidth, target.offsetHeight],
          });
        }
      }
      rec.raf = requestAnimationFrame(tick);
    };
    win.__overlayRec = rec;
    rec.raf = requestAnimationFrame(tick);
  }, selector);
}

export async function setOverlayPhase(page: Page, phase: "enter" | "exit") {
  await page.evaluate((next) => {
    const rec = (window as unknown as { __overlayRec?: { phase: string } }).__overlayRec;
    if (rec) rec.phase = next;
  }, phase);
}

export async function stopOverlayRecorder(page: Page): Promise<AnimationSample[]> {
  return page.evaluate(() => {
    const rec = (
      window as unknown as {
        __overlayRec?: { stopped: boolean; raf: number; samples: unknown[] };
      }
    ).__overlayRec;
    if (!rec) return [];
    rec.stopped = true;
    cancelAnimationFrame(rec.raf);
    return rec.samples;
  }) as Promise<AnimationSample[]>;
}

export const formatOffenders = (items: Offender[], limit = 12) =>
  items
    .slice(0, limit)
    .map((o) => `${o.what}: ${o.where} -> ${o.detail}`)
    .concat(items.length > limit ? [`... and ${items.length - limit} more`] : [])
    .join("\n");

/** Parsed `border-top-left-radius` in px; pills read as 9999. */
export const radiusOf = (locator: Locator) =>
  locator.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius));

export interface FocusState {
  focusVisible: boolean;
  outlineStyle: string;
  outlineWidth: number;
  outlineOffset: number;
  radius: string;
  /** Contrast of the outline colour against the surface the ring is drawn on. */
  ringContrast: number;
  /** Widest zero-offset, zero-blur, non-inset box-shadow (a ring) in px; 0 when none. */
  shadowRing: number;
  borderColor: string;
  borderWidth: number;
  /** Contrast of the border colour against the surface behind the control. */
  borderContrast: number;
}

/** Outline, radius and ring contrast of one element at this instant. */
export function readFocusState(locator: Locator): Promise<FocusState> {
  return locator.evaluate((el) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("canvas 2d unavailable");
    type Rgb = [number, number, number];
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
    const chain: Element[] = [];
    for (let node = el.parentElement; node; node = node.parentElement) chain.unshift(node);
    let surface: Rgb = document.documentElement.classList.contains("dark")
      ? [0, 0, 0]
      : [255, 255, 255];
    for (const node of chain) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") surface = over(bg, surface);
    }
    const cs = getComputedStyle(el);
    const ring = over(cs.outlineColor, surface);
    const edge = over(cs.borderTopColor, surface);
    const [hi, lo] = [lum(ring), lum(surface)].sort((a, b) => b - a);
    const [ehi, elo] = [lum(edge), lum(surface)].sort((a, b) => b - a);
    let shadowRing = 0;
    if (cs.boxShadow && cs.boxShadow !== "none") {
      let depth = 0;
      let current = "";
      const layers: string[] = [];
      for (const ch of cs.boxShadow) {
        if (ch === "(") depth += 1;
        if (ch === ")") depth -= 1;
        if (ch === "," && depth === 0) {
          layers.push(current.trim());
          current = "";
        } else current += ch;
      }
      if (current.trim()) layers.push(current.trim());
      for (const layer of layers) {
        if (/\binset\b/.test(layer)) continue;
        const [x = 0, y = 0, blur = 0, spread = 0] = [...layer.matchAll(/-?\d*\.?\d+px/g)].map(
          (m) => Number.parseFloat(m[0]),
        );
        if (x === 0 && y === 0 && blur === 0) shadowRing = Math.max(shadowRing, spread);
      }
    }
    return {
      focusVisible: el.matches(":focus-visible"),
      outlineStyle: cs.outlineStyle,
      outlineWidth: Number.parseFloat(cs.outlineWidth),
      outlineOffset: Number.parseFloat(cs.outlineOffset),
      radius: cs.borderTopLeftRadius,
      ringContrast: ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05),
      shadowRing,
      borderColor: cs.borderTopColor,
      borderWidth: Number.parseFloat(cs.borderTopWidth),
      borderContrast: ((ehi ?? 0) + 0.05) / ((elo ?? 0) + 0.05),
    };
  });
}

export interface PressState {
  /** Effective scale: the `scale` property (Tailwind v4) times the `transform` matrix. */
  scale: number;
  /** Whether the pressed scale is itself transitioned instead of snapping. */
  transitionsScale: boolean;
}

/** State of a mouse-down held for `holdMs`, released off the control so nothing activates. */
export async function pressedState(
  page: Page,
  locator: Locator,
  holdMs = 400,
): Promise<PressState> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("pressed control must have a layout box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  const state = await locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    const m = cs.transform.match(/^matrix\((.+)\)$/);
    const v = m?.[1]?.split(",").map(Number) ?? [1, 0];
    const matrix = Math.hypot(v[0] ?? 1, v[1] ?? 0);
    const prop = cs.scale && cs.scale !== "none" ? Number.parseFloat(cs.scale) : 1;
    const props = cs.transitionProperty.split(",").map((p) => p.trim());
    return {
      scale: matrix * prop,
      transitionsScale: props.some((p) => ["all", "transform", "scale"].includes(p)),
    };
  });
  await page.mouse.move(0, 0);
  await page.mouse.up();
  return state;
}

export interface ToggleRowScan {
  rows: {
    label: string;
    labelRight: number;
    trackLeft: number;
    trackRight: number;
    panelRight: number;
    /** Off-state fill against the surface it sits on. */
    fillContrast: number;
    /** Off-state thumb against the off-state fill. */
    thumbContrast: number;
    /** Hue of the off-state track edge; a coloured outline here is a status tint on an off switch. */
    borderAlpha: number;
  }[];
}

/**
 * Geometry and contrast of every unchecked boolean switch inside the Props panel.
 * A switch is a control: its off state must clear WCAG 1.4.11 (3:1), carry no
 * status tint, and the rows must share one right-hand column.
 */
export async function scanToggleRows(page: Page): Promise<ToggleRowScan> {
  return page.evaluate(() => {
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
    const luminance = ([r, g, b]: Rgb) => {
      const lin = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const ratio = (a: Rgb, b: Rgb) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
    };
    const rootBase: Rgb = document.documentElement.classList.contains("dark")
      ? [0, 0, 0]
      : [255, 255, 255];
    const surface = (el: Element | null): Rgb => {
      if (!el) return rootBase;
      const parent = surface(el.parentElement);
      const bg = getComputedStyle(el).backgroundColor;
      return bg === "rgba(0, 0, 0, 0)" || bg === "transparent" ? parent : over(bg, parent);
    };
    const round = (n: number) => Math.round(n * 100) / 100;
    const inputs = [
      ...document.querySelectorAll<HTMLInputElement>("#playground input[type=checkbox]"),
    ].filter((input) => !input.checked);
    return {
      rows: inputs.map((input) => {
        const track = input.nextElementSibling as HTMLElement;
        const thumb = track.firstElementChild as HTMLElement;
        const wrap = input.closest("span.inline-flex") as HTMLElement;
        const text = [...wrap.querySelectorAll("label")].find((l) => l.textContent?.trim());
        const page = surface(track.parentElement);
        const fill = over(getComputedStyle(track).backgroundColor, page);
        const thumbFill = over(getComputedStyle(thumb).backgroundColor, fill);
        const panel = wrap.closest("aside") ?? wrap.parentElement;
        const edge = getComputedStyle(track).borderTopColor;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, 1, 1);
        const alpha = ctx.getImageData(0, 0, 1, 1).data[3] ?? 0;
        return {
          label: text?.textContent?.trim() ?? "",
          labelRight: text?.getBoundingClientRect().right ?? 0,
          trackLeft: track.getBoundingClientRect().left,
          trackRight: track.getBoundingClientRect().right,
          panelRight: panel?.getBoundingClientRect().right ?? 0,
          fillContrast: round(ratio(fill, page)),
          thumbContrast: round(ratio(thumbFill, fill)),
          borderAlpha: alpha,
        };
      }),
    };
  });
}
