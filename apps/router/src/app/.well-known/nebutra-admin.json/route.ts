import { ROUTER_ADMIN_MANIFEST } from "@/lib/admin/manifest";

export const dynamic = "force-dynamic";

/** Public: URLs and schemas only, never secrets. */
export function GET() {
  return Response.json(ROUTER_ADMIN_MANIFEST, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
