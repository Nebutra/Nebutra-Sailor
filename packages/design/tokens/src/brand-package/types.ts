/**
 * Brand Package — Create Center carrier contract.
 *
 * This is a *host* for third-party design languages (Linear, GSAP, Raycast, Vercel…),
 * not a list of brand presets. Presets only demonstrate the contract.
 *
 * Layers:
 *   1. roles     — color meaning (action vs brand-mark vs surface…)
 *   2. recipe    — control language (button/badge fill, radii slots, free elev CSS)
 *   3. typography / fonts
 *   4. semantic  — shadcn/Tailwind bridge (derived from roles; components keep using --primary)
 *
 * @see packages/design/ARCHITECTURE.md
 */

/** HSL channel triple without `hsl()` wrapper, e.g. "66 89% 54%" */
export type HslChannels = string;

/** Full CSS color (hex / rgb / hsl / oklch / gradient) */
export type CssColor = string;

export type ButtonDefaultStyle = "solid" | "outline" | "gradient-stroke";

/**
 * Elevation *presets* are only shortcuts that expand to free CSS box-shadow tokens.
 * Carriers should prefer `recipe.elevationTokens` with arbitrary shadow stacks.
 */
export type ElevationStyle = "none" | "soft" | "raised" | "key" | "hairline";

export type Density = "compact" | "comfortable" | "spacious";

/** Badge fill language (may diverge from action CTA) */
export type BadgeDefaultStyle = "match-action" | "match-primary" | "muted" | "outline" | "brand";

/**
 * First-class color roles — what Create Center fills.
 * Maps onto CSS vars and into shadcn semantic for component compatibility.
 */
export interface BrandColorRoles {
  /** Page canvas */
  canvas: HslChannels;
  canvasForeground: HslChannels;
  /** Contained surfaces (cards, panels) */
  surface: HslChannels;
  surfaceForeground: HslChannels;
  /**
   * Product *action* fill (default Button / primary chrome).
   * Must be readable as a CTA — not necessarily the brand mark color.
   */
  action: HslChannels;
  actionForeground: HslChannels;
  /**
   * Brand mark only (logo accent, AI diamond, VI-adjacent product accent).
   * NEVER used for default form CTAs unless Create Center explicitly maps action ← brand.
   */
  brand?: HslChannels;
  brandForeground?: HslChannels;
  /** Quiet fills (secondary, badges muted) */
  quiet: HslChannels;
  quietForeground: HslChannels;
  muted: HslChannels;
  mutedForeground: HslChannels;
  border: HslChannels;
  /**
   * Field stroke. `--input` is consumed only as a border colour (`border-input`
   * on Input, Textarea, Select, Combobox, InputOTP) — never as a fill. Omit it
   * and it derives from `border`, which is what every language wants: six of
   * the seven built-ins had written their own card fill here, producing a field
   * whose outline was the same colour as the surface behind it. Set it only to
   * give fields a stroke that genuinely differs from every other hairline.
   */
  input?: HslChannels;
  ring: HslChannels;
  destructive: HslChannels;
  destructiveForeground: HslChannels;
  success?: HslChannels;
  successForeground?: HslChannels;
  warning?: HslChannels;
  warningForeground?: HslChannels;
  info?: HslChannels;
  infoForeground?: HslChannels;
}

/** Shape slots — components bind per role, not one global radius */
export interface BrandRadii {
  button: string;
  card: string;
  badge?: string;
  input?: string;
  pill?: string;
}

/**
 * Free-form elevation — any CSS box-shadow string the brand requires.
 * Components only read --elevation-card / control / raised.
 */
export interface BrandElevationTokens {
  card: string;
  control?: string;
  raised?: string;
}

/**
 * shadcn/Tailwind bridge. Prefer editing `roles`; semantic is kept in sync by normalize().
 * Components continue to use bg-primary etc. which map to action.
 */
export interface BrandSemanticColors {
  background: HslChannels;
  foreground: HslChannels;
  card: HslChannels;
  cardForeground: HslChannels;
  popover: HslChannels;
  popoverForeground: HslChannels;
  /** = roles.action (product CTA) */
  primary: HslChannels;
  primaryForeground: HslChannels;
  secondary: HslChannels;
  secondaryForeground: HslChannels;
  muted: HslChannels;
  mutedForeground: HslChannels;
  accent: HslChannels;
  accentForeground: HslChannels;
  destructive: HslChannels;
  destructiveForeground: HslChannels;
  border: HslChannels;
  /**
   * Field stroke. `--input` is consumed only as a border colour (`border-input`
   * on Input, Textarea, Select, Combobox, InputOTP) — never as a fill. Omit it
   * and it derives from `border`, which is what every language wants: six of
   * the seven built-ins had written their own card fill here, producing a field
   * whose outline was the same colour as the surface behind it. Set it only to
   * give fields a stroke that genuinely differs from every other hairline.
   */
  input?: HslChannels;
  ring: HslChannels;
  success?: HslChannels;
  successForeground?: HslChannels;
  warning?: HslChannels;
  warningForeground?: HslChannels;
  info?: HslChannels;
  infoForeground?: HslChannels;
}

/**
 * Canonical product-chrome recipe (post-normalize).
 * Free radii + free elevation tokens only — no buttonRadius/elevation aliases.
 */
export interface BrandRecipe {
  buttonDefault: ButtonDefaultStyle;
  density: Density;
  radii: BrandRadii;
  elevationTokens: BrandElevationTokens;
  primaryStrokeGradient?: string;
  outlineBorder?: CssColor;
  badgeDefault?: BadgeDefaultStyle;
}

/**
 * Loose recipe accepted by normalize/compile before canonicalization.
 * Legacy keys (buttonRadius, elevation preset, cardShadow) are input-only.
 */
export type BrandRecipeInput = {
  buttonDefault: ButtonDefaultStyle;
  density?: Density;
  radii?: BrandRadii;
  elevationTokens?: BrandElevationTokens;
  /** @deprecated input-only — expanded to elevationTokens */
  elevation?: ElevationStyle;
  primaryStrokeGradient?: string;
  outlineBorder?: CssColor;
  badgeDefault?: BadgeDefaultStyle;
  /** @deprecated input-only — use radii.button */
  buttonRadius?: string;
  /** @deprecated input-only — use radii.card */
  cardRadius?: string;
  /** @deprecated input-only — use radii.badge */
  badgeRadius?: string;
  /** @deprecated input-only — use radii.input */
  inputRadius?: string;
  /** @deprecated input-only — use elevationTokens.card */
  cardShadow?: string;
};

export interface BrandFontSource {
  url: string;
  format?: "woff2" | "woff" | "truetype" | "opentype" | "svg";
}

export interface BrandFontFace {
  family: string;
  src: BrandFontSource[];
  weight?: number | string;
  style?: "normal" | "italic" | "oblique";
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
  unicodeRange?: string;
}

export interface BrandTypography {
  fontSans: string;
  fontMono?: string;
  fontDisplay?: string;
  headingWeight?: number | string;
  faces?: BrandFontFace[];
}

/**
 * How a design language moves.
 *
 * Motion is a dimension of a language, not a constant: Linear resolves almost
 * before you notice, Notion settles, GSAP performs. Until this existed the
 * durations and curves were declared once in the shared token sheet and no skin
 * could override them, so switching brand changed every colour, radius, face and
 * type scale on the page — and left the timing identical.
 *
 * Durations are milliseconds and carry the same four names the token sheet
 * already ships, so a component written against `--duration-flow` picks up the
 * language it is under without changing.
 */
export interface BrandMotion {
  /** Entering — decelerates into place. */
  easeOut?: string;
  /** Moving between two on-screen states. */
  easeInOut?: string;
  /** Overshoots and settles. Omit for languages that never overshoot. */
  easeSpring?: string;
  /** State flips the eye should not have to wait for: hover, press, check. */
  micro?: number;
  /** Something moving across the surface: a drawer, a tab indicator. */
  flow?: number;
  /** Something arriving that was not there: a panel, a toast. */
  reveal?: number;
  /** Deliberately slow, for a single focal moment. Never for chrome. */
  cinematic?: number;
}

/**
 * How much room a language leaves around its content.
 *
 * Spacing is a dimension of a language the same way motion is: Linear and
 * Raycast sit close to the content they chrome, Notion and Vanta give it room
 * to breathe. Before this existed, Tailwind's numeric scale (`p-4`, `gap-2`)
 * was the only spacing vocabulary in the repo, and it is a fixed arithmetic
 * multiplier (`--spacing: 0.25rem`) shared by width, height and line-height —
 * repointing it per brand would rescale icons and text along with padding.
 *
 * This is a second, narrower, opt-in scale emitted as `--space-source-*`.
 * Components read those vars directly. Never bridge them into `@theme` as
 * `--spacing-sm` / `--spacing-md` / etc.: Tailwind v4 treats those keys as
 * size tokens, which hijacks `max-w-sm` through `max-w-2xl`.
 *
 * Values are full CSS lengths (e.g. `"1rem"`), not multiples. Only the keys a
 * language declares are emitted; an omitted step inherits the shared default
 * rather than being reset to it.
 */
export interface BrandSpacing {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  "2xl"?: string;
}

export interface BrandExtensions {
  /** Taxonomy / category accents (GSAP disciplines, etc.) — product chrome may ignore */
  categories?: Record<string, CssColor>;
  /** Marketing-only decorative gradients (spectrum, hero floor) — never product CTA */
  decorative?: Record<string, string>;
  displaySizePx?: number;
  sourceUrl?: string;
  notes?: string[];
}

/**
 * One appearance mode’s colors (light or dark).
 * Prefer roles; semantic is the shadcn bridge (derived when omitted).
 */
export interface BrandModePalette {
  roles?: BrandColorRoles;
  semantic?: BrandSemanticColors;
}

/**
 * Optional dual-mode colors. When both light and dark are set, emit binds:
 *   light → :root / html[data-brand]
 *   dark  → .dark / html.dark[data-brand]
 * Single-mode packs omit this and use top-level semantic + darkDefault selector rules.
 */
export interface BrandModes {
  light?: BrandModePalette;
  dark?: BrandModePalette;
}

export interface BrandPackage {
  id: string;
  name: string;
  darkDefault: boolean;
  version: string;
  /**
   * Canonical color roles for the **default** mode (see darkDefault).
   * If omitted, derived from semantic on normalize().
   */
  roles?: BrandColorRoles;
  /**
   * shadcn bridge for the default mode — always present after normalize().
   */
  semantic: BrandSemanticColors;
  /**
   * Dual light/dark palettes (optional). When present after normalize, both modes
   * are fully specified and emitBrandCss writes separate light/dark color blocks.
   */
  modes?: BrandModes;
  /** Always canonical after normalizeBrandPackage(). */
  recipe: BrandRecipe;
  typography: BrandTypography;
  /** How the language moves. Falls back to the shared ramp when omitted. */
  motion?: BrandMotion;
  /** How much room the language leaves around content. Falls back to the shared scale when omitted. */
  spacing?: BrandSpacing;
  extensions?: BrandExtensions;
}

/** Pre-normalize package (recipe may still use legacy keys). */
export type BrandPackageInput = Omit<BrandPackage, "recipe"> & {
  recipe: BrandRecipeInput;
  modes?: BrandModes;
};

export interface CompileResult {
  brand: BrandPackage;
  css: string;
  warnings: string[];
}
