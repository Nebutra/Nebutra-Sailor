/**
 * @nebutra/fonts/next/cjk — the self-hosted brand faces (server-only).
 *
 * The Latin brand face lives here through `next/font/local` so first-party apps work
 * offline, in CI and in the network sandbox (`next/font/google` fails there):
 *
 *  - MiSans — the Simplified-Chinese face — is CDN-hosted; see <CjkFontFace /> below.
 *  - DM Sans — the Latin display/heading face (SIL OFL). Chosen the same day
 *    from the same measurement (DeepSeek, Databricks). Body/UI Latin stays
 *    Geist: its tabular figures are what dense dashboard tables need.
 *
 * WHY A SEPARATE ENTRY FROM `./next`: that module declares ~16
 * `next/font/google` faces for the theme / DESIGN.md registry; importing it for
 * the brand faces would drag those build-time downloads into every app. `./next`
 * re-exports this file, so an app already applying `fontRegistryClassName`
 * still needs one import.
 *
 * next/font is a compile-time transform: SWC statically analyses the call, so
 * the options object is spelled out as a literal.
 */

import localFont from "next/font/local";

/**
 * MiSans is NOT loaded here: its licence forbids distributing the font on its
 * own and this repository is public (vivo Sans was removed for the same reason,
 * b5e73db35). The subsets are served from the deployment's asset CDN and
 * declared by <CjkFontFace />, re-exported below — render it in the root
 * layout next to this class name. The token stacks reference
 * var(--font-misans, "MiSans"): with no variable set, the literal family name
 * resolves to that @font-face.
 */
export { CjkFontFace, misansFontFaceCss } from "./cjk-font-face";

/**
 * DM Sans — one variable file (opsz 9–40, wght 100–1000), Latin subset, 67KB.
 * Preloaded: headings render above the fold on most pages.
 */
export const dmSans = localFont({
  src: [{ path: "../generated/dm-sans.woff2", weight: "100 1000", style: "normal" }],
  display: "swap",
  variable: "--font-dm-sans",
});

/**
 * Apply to <html> next to the Geist loaders so `--font-dm-sans` exists:
 *
 *   className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`}
 *
 * The name predates DM Sans; it now carries both brand faces so every app that
 * already applies it picks them up without a layout change.
 */
export const brandFontClassName = dmSans.variable;
export const cjkFontClassName = brandFontClassName;
