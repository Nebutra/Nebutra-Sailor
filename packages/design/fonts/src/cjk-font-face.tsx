/**
 * MiSans @font-face, rendered at request time rather than shipped as CSS.
 *
 * The MiSans licence forbids distributing the font on its own and this
 * repository is public, so the subsets live in the deployment's public asset
 * bucket and only their keys are committed (../generated/index.ts). A static
 * stylesheet would have to spell out a host, and the host differs per
 * deployment: Nebutra's CDN for Nebutra, the scaffold's own for a template
 * user. publicAssetUrl() resolves it the way it resolves every other public
 * asset — NEXT_PUBLIC_R2_PUBLIC_URL, then R2_PUBLIC_URL, then the brand's cdn
 * origin.
 *
 * Before the subsets have been uploaded (a fresh scaffold, `pnpm subset:cjk
 * --upload` not yet run) the requests 404 and the token stacks fall through to
 * PingFang / YaHei. That is the intended degraded state, not an error.
 */

import { publicAssetUrl } from "@nebutra/brand/metadata-helpers";
import { MISANS_FAMILY, MISANS_FILES, MISANS_UNICODE_RANGE } from "../generated/index";

/** One @font-face per weight, CJK-only unicode-range, `swap` so text is never invisible. */
export function misansFontFaceCss(origin?: string): string {
  return MISANS_FILES.map(
    (face) =>
      `@font-face{font-family:"${MISANS_FAMILY}";font-style:normal;font-weight:${face.weight};` +
      `font-display:swap;src:url("${publicAssetUrl(face.key, origin)}") format("woff2");` +
      `unicode-range:${MISANS_UNICODE_RANGE}}`,
  ).join("\n");
}

export interface CjkFontFaceProps {
  /** Asset origin override; defaults to the publicAssetUrl() resolution. */
  origin?: string;
}

/**
 * Render once in each root layout, next to `cjkFontClassName` on <html>.
 * React 19 hoists a `<style>` carrying `href` + `precedence` into <head> and
 * dedupes it by `href`, so rendering it twice costs nothing.
 */
export function CjkFontFace({ origin }: CjkFontFaceProps) {
  return (
    <style href="nebutra-misans" precedence="default">
      {misansFontFaceCss(origin)}
    </style>
  );
}
