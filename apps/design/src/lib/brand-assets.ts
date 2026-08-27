import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The real logo files, read at build time.
 *
 * This page previously rendered `LogoEnColorSVG` as the primary mark, which the
 * component's own file header calls out as the thing not to do: it is the mono
 * path painted with a *fake* linear gradient and a baked wordmark — "Avoid for
 * nav — not VI 正标". So the identity page was showing everything except the
 * identity, and `logoColorUsage.preferred` has said `"color"` the whole time.
 *
 * The 正标 is a multi-path Illustrator export with real facet geometry and true
 * gradients; there is no component form of it because there is nothing to
 * parameterise — it is artwork. Inlining the file at build time is therefore the
 * honest way to show it: no copy in `public/` to drift from the source, no
 * `<img>` that 404s where the assets were never staged, and the bytes on the
 * page are the bytes in the manual.
 */

const LOGO_DIR = join(process.cwd(), "..", "..", "packages", "design", "brand", "assets", "logo");

export type LogoAsset =
  | "logo-color"
  | "logo-horizontal-en"
  | "logo-horizontal-zh"
  | "logo-mono"
  | "logo-inverse";

const cache = new Map<string, string | null>();

/**
 * Inline markup for one asset, sized by the caller.
 *
 * The stored files carry an XML prolog and their own width/height, both of
 * which have to go: a prolog is invalid inside HTML, and a fixed width would
 * ignore the box it is placed in. The viewBox is left alone — it is what makes
 * the artwork scale rather than crop.
 */
export function logoMarkup(asset: LogoAsset, height: number): string | null {
  const key = `${asset}:${height}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  let markup: string | null = null;
  try {
    const raw = readFileSync(join(LOGO_DIR, `${asset}.svg`), "utf8");

    // Namespace every class and id to this asset before inlining.
    //
    // These are Illustrator exports, and Illustrator names things the same way
    // every time: the fills live in a <style> block as `.st0`, `.st1`, and the
    // gradients are `SVGID_1_`. Put two of them in one document and the last
    // <style> wins for all of them — the monochrome and the reversed marks
    // rendered in the colour logo's gradient, on a page whose caption said
    // "单色印刷时使用墨稿版本" directly underneath. `LogoSVG.tsx` already carries a
    // note about duplicate gradient ids for the same reason; this is that
    // problem again, one layer out.
    const ns = asset.replace(/[^a-z0-9]/g, "");
    const scoped = raw
      .replace(/\.st(\d+)/g, `.${ns}-st$1`)
      .replace(
        /class="([^"]*)"/g,
        (_m, names: string) =>
          `class="${names
            .split(/\s+/)
            .filter(Boolean)
            .map((name) => (/^st\d+$/.test(name) ? `${ns}-${name}` : name))
            .join(" ")}"`,
      )
      .replace(/id="([^"]+)"/g, `id="${ns}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${ns}-$1)`)
      .replace(/xlink:href="#([^"]+)"/g, `xlink:href="#${ns}-$1"`);

    markup = scoped
      .replace(/<\?xml[^>]*\?>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<svg([^>]*)>/, (_match, attrs: string) => {
        const viewBox = /viewBox="[^"]*"/.exec(attrs)?.[0] ?? "";
        return `<svg ${viewBox} height="${height}" style="height:${height}px;width:auto" role="img" aria-hidden="true">`;
      })
      .trim();
  } catch {
    // A missing asset shows as a gap on the page rather than failing the build:
    // this site's job is to report what is absent, not to refuse to render.
    markup = null;
  }

  cache.set(key, markup);
  return markup;
}
