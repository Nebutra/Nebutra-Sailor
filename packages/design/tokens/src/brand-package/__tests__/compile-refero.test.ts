import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileReferoTokens } from "../compile-refero";
import { hexToHslChannels } from "../hex-to-hsl";

describe("hexToHslChannels", () => {
  it("converts green", () => {
    assert.match(hexToHslChannels("#0ae448"), /^\d+ \d+% \d+%$/);
  });
});

describe("compileReferoTokens — GSAP", () => {
  it("produces gradient-stroke recipe and category extensions", () => {
    const result = compileReferoTokens({
      id: "gsap",
      designMd: "gradient-stroked CTA pill outlined-only",
      tokens: {
        color: {
          "just-black": { $value: "#0e100f", $type: "color" },
          "surface-cream": { $value: "#fffce1", $type: "color" },
          "surface-50": { $value: "#7c7c6f", $type: "color" },
          "surface-25": { $value: "#42433d", $type: "color" },
          "off-black": { $value: "#191919", $type: "color" },
          "shockingly-green": { $value: "#0ae448", $type: "color" },
          pink: { $value: "#fec5fb", $type: "color" },
          orangey: { $value: "#ff8709", $type: "color" },
          lilac: { $value: "#9d95ff", $type: "color" },
          blue: { $value: "#00bae2", $type: "color" },
        },
        radius: {
          full: { $value: "100px", $type: "dimension" },
          lg: { $value: "8px", $type: "dimension" },
        },
        $extensions: {
          "com.refero.extraction": { siteName: "Gsap", url: "https://gsap.com" },
        },
      },
    });
    assert.equal(result.brand.recipe.buttonDefault, "gradient-stroke");
    assert.equal(result.brand.recipe.buttonRadius, "100px");
    assert.equal(result.brand.recipe.elevation, "none");
    assert.ok(result.brand.extensions?.categories?.scroll);
    assert.match(result.css, /--btn-default-bg: transparent/);
    assert.match(result.css, /--btn-default-stroke-gradient:/);
    assert.match(result.css, /--btn-default-border-width: 1\.5px/);
    assert.match(result.css, /@font-face/);
    assert.match(result.css, /zone-marketing/);
    assert.equal(result.brand.zones?.marketing?.display?.fontSize, "224px");
    assert.ok((result.brand.typography.faces?.length ?? 0) > 0);
    assert.ok(result.warnings.some((w) => w.includes("shockingly-green")));
  });
});

describe("compileReferoTokens — Linear", () => {
  it("produces solid CTA recipe", () => {
    const result = compileReferoTokens({
      id: "linear",
      tokens: {
        color: {
          void: { $value: "#08090a", $type: "color" },
          carbon: { $value: "#0f1011", $type: "color" },
          graphite: { $value: "#23252a", $type: "color" },
          paper: { $value: "#ffffff", $type: "color" },
          "acid-lime": { $value: "#e4f222", $type: "color" },
        },
      },
    });
    assert.equal(result.brand.recipe.buttonDefault, "solid");
    assert.match(result.css, /--btn-default-bg: hsl\(var\(--primary\)\)/);
    assert.match(result.css, /--btn-default-border-width: 0px/);
  });
});

describe("validateBrandPackage", () => {
  it("accepts compiled packages", async () => {
    const { validateBrandPackage } = await import("../validate");
    const result = compileReferoTokens({
      id: "linear",
      tokens: {
        color: {
          void: { $value: "#08090a", $type: "color" },
          paper: { $value: "#ffffff", $type: "color" },
          "acid-lime": { $value: "#e4f222", $type: "color" },
        },
      },
    });
    const v = validateBrandPackage(result.brand);
    assert.equal(v.ok, true);
    assert.ok(result.brand.roles?.action);
    assert.equal(result.brand.semantic.primary, result.brand.roles?.action);
    assert.ok(result.brand.recipe.elevationTokens?.card);
    assert.ok(result.brand.recipe.radii?.button);
  });
});

describe("carrier contract — action ≠ brand", () => {
  it("keeps Raycast brand mark off primary", () => {
    const result = compileReferoTokens({
      id: "raycast",
      tokens: {
        color: {
          "void-black": { $value: "#040506", $type: "color" },
          mist: { $value: "#e6e6e6", $type: "color" },
          iron: { $value: "#454647", $type: "color" },
          "coral-pulse": { $value: "#ff6363", $type: "color" },
          "pure-white": { $value: "#ffffff", $type: "color" },
          ink: { $value: "#07080a", $type: "color" },
        },
      },
    });
    assert.ok(result.brand.roles?.brand);
    assert.notEqual(result.brand.roles?.action, result.brand.roles?.brand);
    assert.equal(result.brand.semantic.primary, result.brand.roles?.action);
    assert.match(result.css, /--brand-mark:/);
    assert.match(result.css, /--role-action:/);
  });
});

describe("compileReferoTokens — Vercel", () => {
  it("uses light monochrome Obsidian CTA and hairline elevation", () => {
    const result = compileReferoTokens({
      id: "vercel",
      designMd:
        "Typeset terminal on white paper. Filled Black Button #171717. Build depth with hairline borders via stacked box-shadows — never with drop-shadow. Never introduce chromatic color outside Terminal Green.",
      tokens: {
        color: {
          "paper-white": { $value: "#fafafa", $type: "color" },
          "pure-white": { $value: "#ffffff", $type: "color" },
          hairline: { $value: "#ebebeb", $type: "color" },
          obsidian: { $value: "#171717", $type: "color" },
          charcoal: { $value: "#4d4d4d", $type: "color" },
          "terminal-green": { $value: "#297a3a", $type: "color" },
        },
        surface: {
          "page-canvas": { $value: "#fafafa", $type: "color" },
          "card-surface": { $value: "#ffffff", $type: "color" },
        },
        $extensions: {
          "com.refero.extraction": { siteName: "Vercel", url: "https://vercel.com" },
        },
      },
    });
    assert.equal(result.brand.id, "vercel");
    assert.equal(result.brand.darkDefault, false);
    assert.equal(result.brand.recipe.buttonDefault, "solid");
    assert.equal(result.brand.recipe.buttonRadius, "6px");
    assert.equal(result.brand.recipe.elevation, "hairline");
    // Light paper background (~98%)
    assert.match(result.brand.semantic.background, /9[0-9]%/);
    // Obsidian primary (~9%)
    assert.match(result.brand.semantic.primary, /^0 0% 9%|0 0% 8%|0 0% 10%/);
    assert.match(result.css, /0px 0px 0px 1px/);
    assert.ok(!result.css.includes("rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset"));
  });
});

describe("compileReferoTokens — Notion", () => {
  it("uses paper canvas, notion-blue action, ink brand-mark, 8/12 radii, elev none", () => {
    const result = compileReferoTokens({
      id: "notion",
      designMd: `
# Notion — Style Reference
**Theme:** light
**Density:** comfortable
Page canvas #f6f5f4, cards #ffffff.
Do not add shadows to content cards — hairline borders only.
| cards | 12px |
| pills | 9999px |
| small | 4px |
| buttons | 8px |
Primary CTA Button Background #0075de. Notion Blue only filled button.
Outlined Text Button border-radius 4px (tertiary only).
`,
      tokens: {
        color: {
          "notion-blue": { $value: "#0075de", $type: "color" },
          "paper-warmth": { $value: "#f6f5f4", $type: "color" },
          "pure-white": { $value: "#ffffff", $type: "color" },
          "ink-black": { $value: "#000000", $type: "color" },
          stone: { $value: "#757575", $type: "color" },
          "sky-tint": { $value: "#e6f3fe", $type: "color" },
          marigold: { $value: "#ffb110", $type: "color" },
          coral: { $value: "#f64932", $type: "color" },
          "midnight-ink": { $value: "#02093a", $type: "color" },
        },
        font: {
          notioninter: { $value: "NotionInter", $type: "fontFamily" },
          "lyon-text": { $value: "Lyon Text", $type: "fontFamily" },
        },
        radius: {
          md: { $value: "4px", $type: "dimension" },
          lg: { $value: "8px", $type: "dimension" },
          xl: { $value: "12px", $type: "dimension" },
          full: { $value: "9999px", $type: "dimension" },
        },
        $extensions: {
          "com.refero.extraction": { siteName: "Notion", url: "https://www.notion.com" },
        },
      },
    });

    assert.equal(result.brand.id, "notion");
    assert.equal(result.brand.darkDefault, false);
    assert.equal(result.brand.recipe.buttonDefault, "solid");
    assert.equal(result.brand.recipe.elevation, "none");
    assert.equal(result.brand.recipe.buttonRadius, "8px");
    assert.equal(result.brand.recipe.cardRadius, "12px");
    // Paper warmth canvas (~96% L), not pure white as page if distinct
    assert.match(result.brand.semantic.background, /9[0-9]%/);
    assert.notEqual(result.brand.semantic.background, result.brand.semantic.card);
    // Notion blue action
    assert.match(result.brand.semantic.primary, /4[0-5]%|43%|44%/);
    assert.ok(result.brand.roles?.brand);
    assert.notEqual(result.brand.roles?.action, result.brand.roles?.brand);
    assert.match(result.css, /--elevation-card: 0 0 #0000/);
    assert.match(result.css, /--radius-button: 8px/);
    assert.match(result.css, /--radius-card: 12px/);
    assert.match(result.css, /--brand-mark:/);
    assert.ok(result.warnings.some((w) => /notion-blue|decorative/i.test(w)));
  });
});

describe("compileReferoTokens — Stripe", () => {
  it("uses indigo action, midnight brand-mark, 4px radius, elevation none", () => {
    const result = compileReferoTokens({
      id: "stripe",
      designMd: `
# Stripe — Style Reference
**Theme:** light
**Density:** comfortable
Stripe avoids shadows entirely. Depth comes from background tint.
Do not use shadows, blurs, or any form of CSS elevation.
Use 4px border-radius on all buttons, inputs, and cards — never pill.
Indigo Ink #533afd for filled buttons. Midnight Ink #061b31 for wordmark.
| buttons | 4px |
| cards | 4px |
Primary Filled Button Background #533afd.
`,
      tokens: {
        color: {
          "indigo-ink": { $value: "#533afd", $type: "color" },
          "indigo-hover": { $value: "#7389ff", $type: "color" },
          "midnight-ink": { $value: "#061b31", $type: "color" },
          slate: { $value: "#64748d", $type: "color" },
          "pure-white": { $value: "#ffffff", $type: "color" },
          mist: { $value: "#f8fafd", $type: "color" },
          frost: { $value: "#e5edf5", $type: "color" },
          "lavender-border": { $value: "#b9b9f9", $type: "color" },
          "periwinkle-wash": { $value: "#e8e9ff", $type: "color" },
        },
        font: {
          "sohne-var": { $value: "sohne-var", $type: "fontFamily" },
        },
        $extensions: {
          "com.refero.extraction": { siteName: "Stripe", url: "https://stripe.com" },
        },
      },
    });

    assert.equal(result.brand.id, "stripe");
    assert.equal(result.brand.darkDefault, false);
    assert.equal(result.brand.recipe.buttonDefault, "solid");
    assert.equal(result.brand.recipe.elevation, "none");
    assert.equal(result.brand.recipe.buttonRadius, "4px");
    assert.equal(result.brand.recipe.cardRadius, "4px");
    assert.equal(result.brand.typography.headingWeight, 300);
    // Indigo action (~61% L), not mist/white
    assert.match(result.brand.semantic.primary, /6[0-5]%|5[5-9]%/);
    assert.ok(result.brand.roles?.brand);
    assert.notEqual(result.brand.roles?.action, result.brand.roles?.brand);
    assert.match(result.brand.semantic.background, /100%|99%/);
    assert.match(result.css, /--elevation-card: 0 0 #0000/);
    assert.match(result.css, /--radius-button: 4px/);
    assert.match(result.css, /--brand-mark:/);
    assert.ok(result.warnings.some((w) => /indigo-ink|midnight/i.test(w)));
  });
});

describe("compileReferoTokens — Vanta", () => {
  it("separates vivid-violet action from indigo-ink brand-mark; pill + no shadow", () => {
    const result = compileReferoTokens({
      id: "vanta",
      designMd: `
# Vanta — Style Reference
Editorial violet ledger on parchment
**Density:** comfortable
Don't drop shadows on cards — the flat 1px-border treatment is the system.
Don't use #5e05c4 as decorative icon fill — it's action-only.
Set every button, input, and badge to 999px radius — the pill is the signature.
Vanta rejects drop shadows entirely. Elevation is 1px hairline borders.
Primary Filled Button fill #5e05c4. Logo in Reckless #260048.
`,
      tokens: {
        color: {
          "indigo-ink": { $value: "#260048", $type: "color" },
          "vivid-violet": { $value: "#5e05c4", $type: "color" },
          "mid-violet": { $value: "#8f47d5", $type: "color" },
          "lavender-wash": { $value: "#ddd6ff", $type: "color" },
          carbon: { $value: "#181822", $type: "color" },
          slate: { $value: "#484960", $type: "color" },
          parchment: { $value: "#f7f8fa", $type: "color" },
          paper: { $value: "#ffffff", $type: "color" },
          "amber-signal": { $value: "#ffbe0f", $type: "color" },
        },
        font: {
          reckless: { $value: "Reckless", $type: "fontFamily" },
          "inter-variable": { $value: "Inter Variable", $type: "fontFamily" },
        },
        radius: {
          buttons: { $value: "999px", $type: "dimension" },
          cards: { $value: "16px", $type: "dimension" },
          badges: { $value: "999px", $type: "dimension" },
          inputs: { $value: "999px", $type: "dimension" },
        },
        $extensions: {
          "com.refero.extraction": { siteName: "Vanta", url: "https://www.vanta.com" },
        },
      },
    });

    assert.equal(result.brand.id, "vanta");
    assert.equal(result.brand.darkDefault, false);
    assert.equal(result.brand.recipe.buttonDefault, "solid");
    assert.equal(result.brand.recipe.elevation, "none");
    assert.equal(result.brand.recipe.density, "comfortable");
    assert.match(result.brand.recipe.buttonRadius ?? "", /999/);
    assert.equal(result.brand.recipe.cardRadius, "16px");
    assert.equal(result.brand.recipe.badgeDefault, "muted");

    // action = vivid violet (~39% L), not indigo (~14% L)
    assert.match(result.brand.semantic.primary, /3[6-9]%|40%/);
    assert.ok(result.brand.roles?.brand);
    assert.notEqual(result.brand.roles?.action, result.brand.roles?.brand);
    assert.equal(result.brand.semantic.primary, result.brand.roles?.action);

    // Light parchment canvas + dark carbon text (not white-on-white)
    assert.match(result.brand.semantic.background, /9[0-9]%/);
    assert.match(result.brand.semantic.foreground, /^24[0-9] |^240 |^0 0% 1|^273 /);

    assert.match(result.css, /--brand-mark:/);
    assert.match(result.css, /--elevation-card: 0 0 #0000/);
    assert.match(result.css, /--radius-button: 999/);
    assert.match(result.brand.typography.fontSans, /Inter/i);
    assert.match(result.brand.typography.fontDisplay ?? "", /Reckless/i);
    assert.equal(result.brand.zones?.marketing?.display?.fontSize, "90px");
    assert.ok(result.warnings.some((w) => /indigo-ink|brand-mark/i.test(w)));
  });
});

describe("compileReferoTokens — Raycast", () => {
  it("uses neutral Mist CTA and key elevation, not coral fill", () => {
    const result = compileReferoTokens({
      id: "raycast",
      designMd:
        "Neutral Filled Button Mist fill. Don't use chromatic action buttons. keyboard key shadow stack. Hero gradient artwork only.",
      tokens: {
        color: {
          "void-black": { $value: "#040506", $type: "color" },
          ink: { $value: "#07080a", $type: "color" },
          mist: { $value: "#e6e6e6", $type: "color" },
          iron: { $value: "#454647", $type: "color" },
          "coral-pulse": { $value: "#ff6363", $type: "color" },
          "pure-white": { $value: "#ffffff", $type: "color" },
          graphite: { $value: "#1b1c1e", $type: "color" },
          slate: { $value: "#2f3031", $type: "color" },
        },
        $extensions: {
          "com.refero.extraction": { siteName: "Raycast", url: "https://raycast.com" },
        },
      },
    });
    assert.equal(result.brand.id, "raycast");
    assert.equal(result.brand.recipe.buttonDefault, "solid");
    assert.equal(result.brand.recipe.buttonRadius, "8px");
    assert.equal(result.brand.recipe.cardRadius, "16px");
    assert.equal(result.brand.recipe.elevation, "key");
    assert.equal(result.brand.recipe.badgeDefault, "muted");
    // Mist primary (light), not void-black / coral
    assert.match(result.brand.semantic.primary, /90%|89%|91%/);
    assert.match(result.css, /--elevation-card: rgba\(255/);
    assert.match(result.css, /--badge-default-bg: hsl\(var\(--secondary\)\)/);
    assert.ok(result.warnings.some((w) => w.includes("coral")));
  });
});
