/**
 * @nebutra/fonts/next — build-time self-hosted OSS font faces (server-only).
 *
 * Each face is loaded via next/font/google, which downloads the font AT BUILD
 * TIME and self-hosts it from the app's own origin — there are ZERO runtime
 * requests to Google (no IP leak / GDPR concern, no third-party runtime
 * dependency). Each face exposes a CSS variable; the browser only fetches a
 * given font file when an element actually uses that variable, so declaring the
 * whole registry is cheap.
 *
 * Apply `fontRegistryClassName` to <html> so the `--font-*` variables exist;
 * the appearance layer then prepends the matching `var(--font-*)` (see the
 * client-safe map in `@nebutra/fonts`) when a theme / DESIGN.md font matches.
 *
 * All declarations use a literal options object — next/font statically analyses
 * the call, so the config must NOT be computed. Variable fonts omit `weight`.
 * Keep the `variable` names in sync with FONT_REGISTRY in `../index.ts`.
 *
 * The self-hosted Simplified-Chinese face lives in `./next-cjk` (next/font/local,
 * no Google fetch) and is re-exported here for discoverability. It is NOT folded
 * into `fontRegistryClassName`: the CJK face is core typography, not an optional
 * theme face, and every app wires it the same way — `${cjkFontClassName}` on
 * <html> beside the Geist loaders. Apps that only need the CJK face should import
 * `@nebutra/fonts/next/cjk` directly so they don't pull in the Google faces below.
 */

import {
  DM_Sans,
  Figtree,
  Fira_Code,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Lexend,
  Manrope,
  Montserrat,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Roboto_Mono,
  Sora,
  Source_Code_Pro,
  Source_Serif_4,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";

export { cjkFontClassName, vivoSansCn } from "./next-cjk";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-inter-tight",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair-display",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-reg-manrope" });
const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-reg-sora" });
const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-work-sans",
});
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-reg-dm-sans" });
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-plus-jakarta-sans",
});
const outfit = Outfit({ subsets: ["latin"], display: "swap", variable: "--font-reg-outfit" });
const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-reg-figtree" });
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-montserrat",
});
const lexend = Lexend({ subsets: ["latin"], display: "swap", variable: "--font-reg-lexend" });
const firaCode = Fira_Code({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-fira-code",
});
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-roboto-mono",
});
const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-source-serif-4",
});
const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reg-source-code-pro",
});

/** All registry faces, in declaration order. */
export const FONT_REGISTRY_FACES = [
  inter,
  interTight,
  spaceGrotesk,
  playfairDisplay,
  sourceSerif4,
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
