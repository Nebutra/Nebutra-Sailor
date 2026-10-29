import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  contrast,
  cssBlocks,
  declared,
  HAIRLINE_CONTRAST,
  hslToRgb,
  MOTION_CEILING,
  palettes,
  toPx,
} from "../../scripts/surface-audit.mjs";

/**
 * The surface contract: what every design language paints by default.
 *
 * "Looks like a wireframe" is not a taste, it is a measurable thing — a static
 * border that contrasts with its surface far more than a hairline, corners that
 * do not climb the ladder, a focus ring with no gap, motion that is missing from
 * one language and 600ms in another. These tests hold the numbers.
 */
const root = join(import.meta.dirname, "../..");
const read = (file: string) => readFileSync(join(root, file), "utf8");

const styles = read("styles.css");
const recipe = read("recipe.css");
const skinFiles = readdirSync(join(root, "skins"))
  .filter((file) => file.endsWith(".css"))
  .sort();
const skins = skinFiles.map((file) => ({
  id: file.replace(/\.css$/, ""),
  css: read(`skins/${file}`),
}));

/** Declarations of the first rule whose selector matches. */
const rule = (css: string, selector: RegExp) => {
  const hit = cssBlocks(css).find((block) => selector.test(block.selector));
  assert.ok(hit, `no rule matching ${selector}`);
  return hit.body;
};

describe("surface audit helper", () => {
  it("measures contrast the WCAG way", () => {
    assert.equal(contrast([255, 255, 255], [0, 0, 0]).toFixed(1), "21.0");
    assert.equal(contrast(hslToRgb(0, 0, 100), hslToRgb(0, 0, 100)), 1);
  });
});

describe("static borders are hairlines", () => {
  const { min, max } = HAIRLINE_CONTRAST;
  const check = (label: string, css: string) => {
    const found = palettes(css);
    assert.ok(found.length > 0, `${label}: no palette found`);
    for (const p of found) {
      for (const [against, ratio] of [
        ["background", p.borderVsBackground],
        ["card", p.borderVsCard],
      ] as const) {
        if (ratio === null) continue;
        assert.ok(
          ratio >= min && ratio <= max,
          `${label} (${p.mode}) --border ${p.border} is ${ratio.toFixed(2)}:1 against ${against}; ` +
            `a hairline is ${min}–${max}:1. A heavier stroke belongs in --border-strong.`,
        );
      }
    }
  };

  it("holds for the factory, light and dark", () => {
    check("factory", styles);
    assert.deepEqual(
      palettes(styles)
        .map((p) => p.mode)
        .sort(),
      ["dark", "light"],
    );
  });

  for (const { id, css } of skins) {
    it(`holds for ${id}, in every mode it declares`, () => check(id, css));
  }
});

describe("--border-strong carries the heavy stroke", () => {
  for (const { id, css } of skins) {
    it(`${id} declares one per mode, visibly stronger than its hairline`, () => {
      for (const p of palettes(css)) {
        assert.ok(p.strongValue, `${id} (${p.mode}) declares no --border-strong`);
        assert.ok(
          (p.strongVsBackground ?? 0) >= p.borderVsBackground + 0.5,
          `${id} (${p.mode}) --border-strong is ${p.strongVsBackground?.toFixed(2)}:1, ` +
            `hairline ${p.borderVsBackground.toFixed(2)}:1 — a strong stroke has to read as stronger`,
        );
      }
    });
  }

  it("keeps Vanta's carbon ink as its strong stroke (identity moves, it is not lost)", () => {
    const vanta = skins.find((s) => s.id === "vanta");
    assert.ok(vanta);
    const light = palettes(vanta.css).find((p) => p.mode === "light");
    assert.ok((light?.strongVsBackground ?? 0) >= 12, "Vanta light ink should stay near-black");
  });
});

describe("the factory ladder: control 8, card 12, chip 6", () => {
  const body = rule(recipe, /^:root$/);
  const px = (name: string) => toPx(declared(body, name));

  it("declares one step per job", () => {
    assert.equal(px("--radius-control"), 8);
    assert.equal(px("--radius-card"), 12);
    assert.equal(px("--radius-chip"), 6);
  });

  it("points the component slots at the control step instead of restating it", () => {
    assert.equal(declared(body, "--radius-button"), "var(--radius-control)");
    assert.equal(declared(body, "--radius-inputs"), "var(--radius-control)");
  });

  it("makes a factory badge a chip, not a pill", () => {
    assert.equal(declared(body, "--radius-badge"), "var(--radius-chip)");
  });

  it("keeps Vanta's controls on the ladder (12px) and its chips and badges pills", () => {
    const vanta = skins.find((s) => s.id === "vanta");
    assert.ok(vanta);
    const block = rule(vanta.css, /data-brand/);
    assert.equal(toPx(declared(block, "--radius-control")), 12);
    assert.equal(toPx(declared(block, "--radius-button")), 12);
    assert.equal(toPx(declared(block, "--radius-chip")), 999);
    assert.equal(toPx(declared(block, "--radius-badge")), 999);
  });

  for (const { id, css } of skins) {
    it(`${id} climbs the ladder: chip, control and card never out of order`, () => {
      const block = rule(css, /data-brand/);
      const control = declared(block, "--radius-control");
      const chip = declared(block, "--radius-chip");
      const card = toPx(declared(block, "--radius-card"));
      assert.ok(control && chip, `${id} declares no --radius-control / --radius-chip`);
      assert.ok(card !== null, `${id} --radius-card is not a plain length`);
      // A pill (>= 100px) is a decision a language makes about a control; it is
      // exempt from the ladder, a corner smaller than the control's is not.
      const controlPx = toPx(control);
      if (controlPx !== null && controlPx < 100) {
        assert.ok(
          controlPx <= card,
          `${id}: control ${controlPx}px is rounder than card ${card}px`,
        );
      }
      const chipPx = toPx(chip);
      if (chipPx !== null && chipPx < 100) {
        assert.ok(chipPx <= card, `${id}: chip ${chipPx}px is rounder than card ${card}px`);
      }
    });
  }
});

describe("the surface vocabulary every app can reach for", () => {
  // A badge is a chip. It is a pill only where the language's own controls are pills,
  // and Cosmos squares its badge at its 16px control radius. Anything else was an
  // undeclared 9999px fallback, so every language states its choice here.
  const BADGE_SHAPE: Record<string, string> = {
    cosmos: "16px",
    gsap: "9999px",
    linear: "4px",
    "nebutra-site": "6px",
    notion: "6px",
    raycast: "6px",
    stripe: "4px",
    vanta: "999px",
    vercel: "6px",
  };

  it("gives every design language a stated badge radius", () => {
    assert.deepEqual(
      skins.map((s) => s.id).sort(),
      Object.keys(BADGE_SHAPE).sort(),
      "a new language must declare its badge shape in BADGE_SHAPE",
    );
    for (const { id, css } of skins) {
      const block = rule(css, /data-brand/);
      assert.equal(declared(block, "--radius-badge"), BADGE_SHAPE[id], `${id} --radius-badge`);
      assert.equal(
        declared(block, "--badge-default-radius"),
        BADGE_SHAPE[id],
        `${id} --badge-default-radius`,
      );
    }
  });

  const theme = cssBlocks(recipe)
    .filter((block) => block.selector.startsWith("@theme"))
    .map((block) => block.body)
    .join("\n");

  it("declares hairline tokens for both modes", () => {
    for (const name of [
      "--hairline-alpha",
      "--hairline-alpha-hover",
      "--border-hairline",
      "--border-hairline-hover",
      "--border-strong",
      "--border-default",
    ]) {
      assert.match(recipe, new RegExp(`${name}\\s*:`), `${name} missing from recipe.css`);
    }
    // Dark needs a little more lift for the same line to read.
    const light = Number.parseFloat(
      declared(rule(recipe, /^:where\(:root\)$/), "--hairline-alpha") ?? "",
    );
    const dark = Number.parseFloat(
      declared(rule(recipe, /^:where\(\.dark\)$/), "--hairline-alpha") ?? "",
    );
    assert.ok(light >= 6 && light <= 10, `light hairline alpha ${light}% outside 6–10%`);
    assert.ok(
      dark > light && dark <= 16,
      `dark hairline alpha ${dark}% should exceed light and stay <= 16%`,
    );
  });

  it("exposes shadow-border, shadow-border-hover and shadow-border-strong as Tailwind shadows", () => {
    for (const name of ["--shadow-border", "--shadow-border-hover", "--shadow-border-strong"]) {
      assert.match(theme, new RegExp(`${name}\\s*:\\s*0 0 0 1px`), `${name} missing from @theme`);
      // One line: Tailwind reads a line break inside a shadow as the colour slot
      // and breaks `shadow-border shadow-<colour>` composition.
      assert.match(
        theme,
        new RegExp(`${name}\\s*:\\s*0 0 0 1px [^\\n;]+;`),
        `${name} must be one line`,
      );
    }
  });

  it("exposes hairline colours as Tailwind colours", () => {
    for (const name of ["--color-hairline", "--color-hairline-hover", "--color-border-strong"]) {
      assert.match(theme, new RegExp(`${name}\\s*:`), `${name} missing from @theme`);
    }
  });

  it("gives focus one recipe: 2px ring, 2px gap, ring colour from --ring", () => {
    // Constants live on :root; the derived values are re-declared under
    // `:root, .dark` so a nested dark subtree resolves its own --ring and
    // --background instead of inheriting the light ones.
    const constants = rule(recipe, /^:root$/);
    assert.equal(declared(constants, "--focus-ring-width"), "2px");
    assert.equal(declared(constants, "--focus-ring-offset"), "2px");
    const body = rule(recipe, /^:root, \.dark$/);
    assert.match(declared(body, "--focus-ring-color") ?? "", /var\(--ring\)/);
    const shadow = declared(body, "--shadow-focus") ?? "";
    assert.match(shadow, /var\(--focus-ring-offset\)/);
    assert.match(shadow, /var\(--background\)/, "the gap is the page colour, not transparent");
    assert.match(shadow, /var\(--focus-ring-color\)/);
    // The legacy 40%-translucent, gap-less ring is gone from the one token.
    assert.doesNotMatch(declared(body, "--focus-ring") ?? "", /\/ 0\.4/);
  });

  it("ships a dot-matrix stage token and utility", () => {
    for (const name of ["--dot-matrix-color", "--dot-matrix-size", "--dot-matrix-image"]) {
      assert.match(recipe, new RegExp(`${name}\\s*:`), `${name} missing`);
    }
    assert.match(recipe, /@utility bg-dot-matrix\s*\{/);
  });

  it("documents the vocabulary where it is declared", () => {
    for (const name of ["--border-hairline", "--shadow-border", "--dot-matrix-image"]) {
      const at = recipe.indexOf(name);
      assert.ok(at > 0, `${name} missing`);
      const preceding = recipe.slice(Math.max(0, at - 700), at);
      assert.match(preceding, /\*\/|\/\*/, `${name} has no comment above it`);
    }
  });
});

describe("motion is complete in every language", () => {
  const num = (value: string | null) => Number.parseFloat(value ?? "");
  const rails = ["micro", "flow", "reveal", "cinematic"] as const;

  for (const { id, css } of [{ id: "factory", css: styles }, ...skins]) {
    it(`${id} declares the four rails and the three curves, ordered and under the ceilings`, () => {
      const body = cssBlocks(css)
        .map((b) => b.body)
        .join("\n");
      const ms = rails.map((rail) => num(declared(body, `--motion-duration-${rail}`)));
      ms.forEach((value, i) =>
        assert.ok(Number.isFinite(value), `${id} --motion-duration-${rails[i]} missing`),
      );
      // The alias the components read agrees with the rail.
      rails.forEach((rail, i) =>
        assert.equal(
          num(declared(body, `--duration-${rail}`)) || ms[i],
          ms[i],
          `${id} --duration-${rail} drifts`,
        ),
      );
      const [micro, flow, reveal, cinematic] = ms as [number, number, number, number];
      assert.ok(
        micro < flow && flow <= reveal && reveal < cinematic,
        `${id} rails out of order: ${ms}`,
      );
      assert.ok(
        micro <= MOTION_CEILING.micro,
        `${id} micro ${micro}ms > ${MOTION_CEILING.micro}ms`,
      );
      assert.ok(flow <= MOTION_CEILING.flow, `${id} flow ${flow}ms > ${MOTION_CEILING.flow}ms`);
      assert.ok(
        reveal <= MOTION_CEILING.reveal,
        `${id} reveal ${reveal}ms > ${MOTION_CEILING.reveal}ms`,
      );
      for (const curve of ["--motion-ease-out", "--motion-ease-in-out"]) {
        assert.match(declared(body, curve) ?? "", /^cubic-bezier\(/, `${id} ${curve} missing`);
      }
    });
  }
});

describe("unchecked-control edge", () => {
  const mix = (body: string) =>
    /--control-border:\s*color-mix\(in oklab,\s*hsl\(var\(--foreground\)\)\s*(\d+)%/.exec(
      body,
    )?.[1];

  it("is declared for light and for dark, and dark is heavier", () => {
    const light = Number(mix(rule(recipe, /^:root$/)));
    const dark = Number(mix(rule(recipe, /^\.dark$/)));
    assert.ok(Number.isFinite(light) && Number.isFinite(dark), "both modes declare a mix");
    // Measured on the live site: the 50% midpoint is 2.5-3.0:1 against the dark
    // card/muted surfaces on Factory, Vercel and Notion; 56% is the floor that
    // clears 3:1 on every language, 58% is what ships.
    assert.ok(dark >= 56, `dark --control-border mixes ${dark}% foreground; 56% is the 3:1 floor`);
    assert.ok(dark > light, "dark mode needs more foreground than light");
  });

  it("is not overridden by a skin, so the contrast guarantee holds per language", () => {
    for (const { id, css } of skins) {
      assert.ok(!/--control-border\s*:/.test(css), `${id} overrides --control-border`);
    }
  });
});
