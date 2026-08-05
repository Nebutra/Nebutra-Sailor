/**
 * CDN-fronted mirror of the signed Tauri updater manifest.
 *
 * Clients try GitHub first, then this origin (Cloudflare → ECS/Next). The
 * response body is the upstream latest.json unchanged so minisign verification
 * still applies to the same platform asset URLs and signatures.
 */
const UPSTREAM = "https://github.com/nebutra/pebble/releases/latest/download/latest.json";

export const revalidate = 300;

export async function GET() {
  try {
    const upstream = await fetch(UPSTREAM, {
      headers: {
        Accept: "application/json",
        "User-Agent": "pebble.nebutra.com-updater-mirror/1.0",
      },
      // Why: short edge cache; clients also retry + fall back to GitHub.
      next: { revalidate: 300 },
    });

    if (!upstream.ok) {
      return Response.json(
        {
          error: "upstream_unavailable",
          status: upstream.status,
          upstream: UPSTREAM,
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "public, max-age=30, s-maxage=30",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const body = await upstream.text();
    // Light shape check so we never cache an HTML error page as latest.json.
    if (!body.includes('"version"') || !body.includes('"platforms"')) {
      return Response.json(
        { error: "upstream_invalid_manifest" },
        {
          status: 502,
          headers: {
            "Cache-Control": "public, max-age=30, s-maxage=30",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "upstream_fetch_failed", message },
      {
        status: 502,
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=30",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
