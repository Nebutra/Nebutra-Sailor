import { buildLlmsTxt } from "@/lib/llms";

/**
 * `/llms.txt` — the site index for language models. Built from the same data as
 * the sidebar and the component pages (see `lib/llms.ts`); it changes only with
 * a deploy, so the response is cacheable.
 */
export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
