import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { listAdminDirectory } from "@/components/admin/admin-directory-data";
import { getAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

async function authorizeAdmin() {
  const auth = await getAuth();
  if (!auth.isSignedIn || !auth.userId) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:access")) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { response: null };
}

export async function GET(request: Request) {
  try {
    const auth = await authorizeAdmin();
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const directory = await listAdminDirectory({
      query: url.searchParams.get("q"),
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize"),
    });

    return NextResponse.json(directory);
  } catch (error) {
    logger.error("[admin.directory] Failed to list directory", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to list admin directory." }, { status: 500 });
  }
}
