import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Which typefaces each design language asks for, parsed from the skin sheet.
 *
 * A view transition dissolves the old page into the new one, so a change of
 * typeface arrives as pixels and no longer cuts. It cannot help with the other
 * reason type jumps, though: if the incoming family is not resident yet, the
 * browser paints a fallback, the snapshot captures the fallback, and the real
 * face swaps in *after* the dissolve has finished — a jump with nothing left to
 * cover it. That is the one people actually see, because it lands on a settled
 * page rather than mid-animation.
 *
 * So the switch loads the target language's faces before it starts. This is the
 * list it loads, read from the same `skins.css` the switch activates rather than
 * typed out — a language that changes its type gets preloaded on the next build
 * without anyone remembering to update a second list.
 *
 * Generic families are dropped: `ui-sans-serif` and friends are always resident
 * and `document.fonts.load` on them is a wasted round trip.
 */

const SKINS = join(process.cwd(), "..", "..", "packages", "design", "theme", "skins.css");

const GENERIC = new Set([
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "system-ui",
  "sans-serif",
  "serif",
  "monospace",
  "-apple-system",
  "Georgia",
]);

let cached: Record<string, string[]> | null = null;

export function brandFontFamilies(): Record<string, string[]> {
  if (cached) return cached;

  const out: Record<string, Set<string>> = {};
  let css = "";
  try {
    css = readFileSync(SKINS, "utf8");
  } catch {
    cached = {};
    return cached;
  }

  // One pass over `html[...data-brand="x"] { … }` blocks. The dark variants
  // carry the same families, so both fold into the same set.
  const blocks = css.matchAll(/html[^{]*\[data-brand="([a-z0-9-]+)"\][^{]*\{([^}]*)\}/g);
  for (const match of blocks) {
    const brand = match[1];
    const body = match[2];
    if (!brand || !body) continue;
    const bucket = (out[brand] ??= new Set());
    for (const decl of body.matchAll(/--font-[a-z-]+:\s*([^;]+);/g)) {
      const stack = decl[1];
      if (!stack) continue;
      for (const raw of stack.split(",")) {
        const family = raw.trim().replace(/^["']|["']$/g, "");
        // `--font-weight-*` matches the same prefix, so a stack can yield "600"
        // or "510". Loading a face named after a number is a wasted request and
        // a confusing entry in the list; a family is never purely numeric.
        if (!family || /^\d+$/.test(family)) continue;
        if (!GENERIC.has(family)) bucket.add(family);
      }
    }
  }

  cached = Object.fromEntries(Object.entries(out).map(([id, set]) => [id, [...set]]));
  return cached;
}
