import { NextResponse } from "next/server";
import { setActiveOrganizationCookie } from "@/lib/active-organization";
import { getOrganizationsForRequest } from "@/lib/organizations";
import { safeInternalPath } from "@/lib/tenant-path";

/**
 * Make a workspace the active one, then continue to `next`.
 *
 * Exists because a Server Component cannot write a cookie — Next only allows
 * that in a Route Handler or Server Action. `/<slug>` validates membership
 * during render and hands off here to do the one thing it cannot.
 *
 * This is the seam where tenancy still lives in a cookie. Path-scoped tenancy
 * removes the need for it: once every route reads its tenant from the URL,
 * the cookie becomes a memory of "the last workspace you used", consulted only
 * to canonicalise a bare path. Until then, entering by slug has to switch it,
 * or `/acme` would render whatever workspace the cookie last pointed at —
 * silently the wrong tenant, which is worse than a 404.
 *
 * Membership is re-checked here rather than trusted from the caller. A GET
 * that changes state is reachable by anyone who can make the user follow a
 * link, so the guarantee has to live in the handler: the worst a forged link
 * can do is select a workspace the user already belongs to.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("org");
  const destination = safeInternalPath(url.searchParams.get("next"));

  if (!organizationId) {
    return NextResponse.redirect(new URL("/select-org", url.origin));
  }

  const organizations = await getOrganizationsForRequest(request);
  if (!organizations) {
    return NextResponse.redirect(new URL("/sign-in", url.origin));
  }

  const target = organizations.find((organization) => organization.id === organizationId);
  if (!target) {
    // Not a member — send them to pick from what they do have rather than
    // reporting that this workspace exists.
    return NextResponse.redirect(new URL("/select-org", url.origin));
  }

  const response = NextResponse.redirect(new URL(destination, url.origin));
  setActiveOrganizationCookie(response, target.id);
  return response;
}
