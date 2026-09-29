/**
 * @nebutra/fonts/next — the theme / DESIGN.md registry faces (server-only).
 *
 * Every face is loaded through `next/font/local` from a woff2 vendored into
 * this package's own `../generated/registry/` — the build and the dev server
 * make NO request to fonts.googleapis.com / fonts.gstatic.com. That is the
 * point: with `next/font/google`, a machine that cannot reach Google
 * (mainland China, a corporate proxy, a plane) failed `next build` outright
 * and answered 500 from the Turbopack dev server ("Can't resolve
 * '@vercel/turbopack-next/internal/font/google/font'"), so a scaffold's
 * preview site was dead on arrival. npm packages are mirrored everywhere
 * (npmmirror in China); Google Fonts is not.
 *
 * The files are the same Google Fonts builds (same font version, same `wght`
 * axis, identical shaping — checked glyph by glyph against what
 * next/font/google downloaded): Fontsource republishes them under the SIL OFL
 * 1.1, which permits redistribution. Each face is the Latin subset of the
 * upright variable font, the subset the registry declared (`subsets: ["latin"]`)
 * and the only one it preloaded. Weight ranges are the ones Google served.
 * Serif faces take Times New Roman as the metric-matched fallback, as
 * next/font/google did; the rest take Arial. Each face keeps its Google family
 * name through `declarations` — without it next/font/local names the family
 * after the const, and this file's `dmSans` collided with the brand `dmSans` in
 * ./next-cjk: two @font-face rules under one family, and the heading face
 * rendered from the wrong file.
 *
 * Each face exposes a CSS variable; the browser only fetches a given file when
 * an element resolves to that variable, so declaring the whole registry is
 * cheap. Apply `fontRegistryClassName` to <html> so the `--font-*` variables
 * exist; the appearance layer then prepends the matching `var(--font-*)` (see
 * the client-safe map in `@nebutra/fonts`) when a theme / DESIGN.md font
 * matches. Keep the `variable` names in sync with FONT_REGISTRY in `../index.ts`.
 *
 * next/font is a compile-time transform: SWC statically analyses each call, so
 * every options object is a literal and every `path` a string literal,
 * resolved relative to this file. It used to point at
 * `../node_modules/@fontsource-variable/<name>/files/...`, which only exists
 * because pnpm nests every workspace package's own dependencies under its own
 * node_modules — a hoisted `npm install` of the published `@nebutra/fonts`
 * commonly resolves `@fontsource-variable/*` to the installing project's
 * top-level node_modules instead, so that path did not exist there and
 * `next build` failed to resolve the font file. The woff2 files are copied
 * into `../generated/registry/` by `scripts/copy-registry-fonts.mjs` (wired
 * into `build` and `prepack`, and the copies are committed so a clean clone
 * works without running it) and committed to git — same pattern as
 * `../generated/dm-sans.woff2` below — so the path is package-relative and
 * resolves the same regardless of how npm/pnpm/yarn laid out node_modules.
 * `scripts/lint-no-google-fonts.mjs` keeps `next/font/google` out of
 * template-shipped code.
 *
 * The brand faces live in `./next-cjk` — DM Sans (next/font/local) and
 * <CjkFontFace /> for the CDN-hosted MiSans — and are re-exported here for
 * discoverability. They are NOT folded into `fontRegistryClassName`: they are
 * core typography, not optional theme faces, and every app wires them the same
 * way — `${cjkFontClassName}` on <html> beside the Geist loaders and
 * <CjkFontFace /> in the root layout. Apps that only need them should import
 * `@nebutra/fonts/next/cjk` directly so they don't pull in the registry below.
 */

import localFont from "next/font/local";

export { brandFontClassName, CjkFontFace, cjkFontClassName, dmSans } from "./next-cjk";

const inter = localFont({
  src: [
    {
      path: "../generated/registry/inter-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Inter'" }],
  variable: "--font-inter",
});
const interTight = localFont({
  src: [
    {
      path: "../generated/registry/inter-tight-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Inter Tight'" }],
  variable: "--font-reg-inter-tight",
});
const spaceGrotesk = localFont({
  src: [
    {
      path: "../generated/registry/space-grotesk-latin-wght-normal.woff2",
      weight: "300 700",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Space Grotesk'" }],
  variable: "--font-space-grotesk",
});
const playfairDisplay = localFont({
  src: [
    {
      path: "../generated/registry/playfair-display-latin-wght-normal.woff2",
      weight: "400 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Playfair Display'" }],
  adjustFontFallback: "Times New Roman",
  variable: "--font-playfair-display",
});
const fraunces = localFont({
  src: [
    {
      path: "../generated/registry/fraunces-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Fraunces'" }],
  adjustFontFallback: "Times New Roman",
  variable: "--font-reg-fraunces",
});
const jetbrainsMono = localFont({
  src: [
    {
      path: "../generated/registry/jetbrains-mono-latin-wght-normal.woff2",
      weight: "100 800",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'JetBrains Mono'" }],
  variable: "--font-jetbrains-mono",
});
const manrope = localFont({
  src: [
    {
      path: "../generated/registry/manrope-latin-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Manrope'" }],
  variable: "--font-reg-manrope",
});
const sora = localFont({
  src: [
    {
      path: "../generated/registry/sora-latin-wght-normal.woff2",
      weight: "100 800",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Sora'" }],
  variable: "--font-reg-sora",
});
const workSans = localFont({
  src: [
    {
      path: "../generated/registry/work-sans-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Work Sans'" }],
  variable: "--font-reg-work-sans",
});
const dmSans = localFont({
  src: [
    {
      path: "../generated/registry/dm-sans-latin-wght-normal.woff2",
      weight: "100 1000",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'DM Sans'" }],
  variable: "--font-reg-dm-sans",
});
const plusJakartaSans = localFont({
  src: [
    {
      path: "../generated/registry/plus-jakarta-sans-latin-wght-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Plus Jakarta Sans'" }],
  variable: "--font-reg-plus-jakarta-sans",
});
const outfit = localFont({
  src: [
    {
      path: "../generated/registry/outfit-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Outfit'" }],
  variable: "--font-reg-outfit",
});
const figtree = localFont({
  src: [
    {
      path: "../generated/registry/figtree-latin-wght-normal.woff2",
      weight: "300 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Figtree'" }],
  variable: "--font-reg-figtree",
});
const montserrat = localFont({
  src: [
    {
      path: "../generated/registry/montserrat-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Montserrat'" }],
  variable: "--font-reg-montserrat",
});
const lexend = localFont({
  src: [
    {
      path: "../generated/registry/lexend-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Lexend'" }],
  variable: "--font-reg-lexend",
});
const firaCode = localFont({
  src: [
    {
      path: "../generated/registry/fira-code-latin-wght-normal.woff2",
      weight: "300 700",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Fira Code'" }],
  variable: "--font-reg-fira-code",
});
const robotoMono = localFont({
  src: [
    {
      path: "../generated/registry/roboto-mono-latin-wght-normal.woff2",
      weight: "100 700",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Roboto Mono'" }],
  variable: "--font-reg-roboto-mono",
});
const sourceSerif4 = localFont({
  src: [
    {
      path: "../generated/registry/source-serif-4-latin-wght-normal.woff2",
      weight: "200 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Source Serif 4'" }],
  adjustFontFallback: "Times New Roman",
  variable: "--font-reg-source-serif-4",
});
const sourceCodePro = localFont({
  src: [
    {
      path: "../generated/registry/source-code-pro-latin-wght-normal.woff2",
      weight: "200 900",
      style: "normal",
    },
  ],
  display: "swap",
  declarations: [{ prop: "font-family", value: "'Source Code Pro'" }],
  variable: "--font-reg-source-code-pro",
});

/** All registry faces, in declaration order. */
export const FONT_REGISTRY_FACES = [
  inter,
  interTight,
  spaceGrotesk,
  playfairDisplay,
  sourceSerif4,
  fraunces,
  jetbrainsMono,
  manrope,
  sora,
  workSans,
  dmSans,
  plusJakartaSans,
  outfit,
  figtree,
  montserrat,
  lexend,
  firaCode,
  robotoMono,
  sourceCodePro,
] as const;

/**
 * Space-joined `.variable` classNames for every registry face. Apply to <html>
 * so all `--font-*` registry variables are defined (font files lazy-load on
 * first use). Combine with the app's own Geist faces.
 */
export const fontRegistryClassName = FONT_REGISTRY_FACES.map((face) => face.variable).join(" ");
