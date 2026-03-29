import { type NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getGrowthSummary } from "@/lib/warehouse/gold";

export async function GET(request: NextRequest) {
  let tenantId =
    request.nextUrl.searchParams.get("tenantId") ||
    request.headers.get("x-organization-id") ||
    undefined;

  if (!tenantId) {
    const authState = await getAuth();
    tenantId = authState.orgId || undefined;
  }

  const summary = await getGrowthSummary(tenantId || undefined);

  return NextResponse.json({
    tenantId: summary.tenantId,
    summary,
  });
}
