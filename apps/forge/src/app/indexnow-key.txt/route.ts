import { getIndexNowKey } from "@/lib/seo";

/**
 * IndexNow ownership proof. The spec allows any path as long as the ping
 * declares it via `keyLocation`, so this stays a fixed route rather than a
 * `/{key}.txt` rewrite — rewrites are frozen into the build, and the key is
 * only known to the runtime host.
 */
export function GET() {
  const key = getIndexNowKey();
  if (!key) {
    return new Response("indexnow_unconfigured", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
