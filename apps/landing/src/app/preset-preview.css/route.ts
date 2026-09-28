import { parsePreset } from "@nebutra/tokens/preset";
import { carrierForPreset } from "@/lib/preset-carrier";
import { readPresetCookie } from "@/lib/preset-cookie";
import { PRESET_PREVIEW } from "@/lib/preset-preview-flag";

/**
 * The visitor's Sailor Studio look as a stylesheet, read from their cookie —
 * the preview site's first paint wears it. Served only by a build with
 * NEXT_PUBLIC_PRESET_PREVIEW=1 (the demonstration site); a project's own site
 * gets its look from project.css and answers 404 here.
 */
export async function GET(request: Request) {
  if (!PRESET_PREVIEW) {
    return new Response("Not found", { status: 404 });
  }
  const code = readPresetCookie(request.headers.get("cookie"));
  let css = "";
  if (code) {
    try {
      css = carrierForPreset(parsePreset(code), "html").css;
    } catch {
      css = "";
    }
  }
  return new Response(css, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      // Per visitor: never shared, never stored.
      "Cache-Control": "private, no-store",
    },
  });
}
