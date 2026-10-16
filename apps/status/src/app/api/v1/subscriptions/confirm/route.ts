/**
 * Links sent before the styled pages existed point here. Redirect to the
 * page, which confirms on open, so old emails keep working.
 */
import { pageRedirect } from "@/server/notify/pages";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return pageRedirect(request, "/subscriptions/confirm");
}
