import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { hasActivePlan } from "@/lib/billing/active-plan";

/**
 * GET /api/billing/active-plan
 *
 * Returns whether the caller's active organization currently holds a paid plan.
 * Used by the `/checkout-return` polling page to wait for the Stripe webhook to
 * land in our DB before redirecting the user out of the post-checkout flow.
 *
 * Auth:
 *  - 401 when there is no signed-in user.
 *  - 400 when there is no active org on the session.
 *  - 403 when the caller passes an explicit `?orgId=` that doesn't match the
 *    session org (defensive — never read another tenant's billing state).
 */
export async function GET(request: Request) {
  const { userId, orgId } = await getAuth(request);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "No active organization on the session." }, { status: 400 });
  }

  const url = new URL(request.url);
  const requestedOrgId = url.searchParams.get("orgId");
  if (requestedOrgId && requestedOrgId !== orgId) {
    return NextResponse.json(
      { error: "orgId query param does not match the active session organization." },
      { status: 403 },
    );
  }

  const result = await hasActivePlan(orgId);
  return NextResponse.json(result, { status: 200 });
}
