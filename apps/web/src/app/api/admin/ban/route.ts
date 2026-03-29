import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth.js";
import { db } from "@/lib/db.js";
import { hasPermission, resolveRole } from "@/lib/permissions.js";

export async function POST(req: Request) {
  const auth = await getAuth();
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);

  if (!auth.isSignedIn || !hasPermission(role, "admin:manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const userId = formData.get("userId") as string;
  const action = formData.get("action") as string;

  if (!userId || !["ban", "unban"].includes(action)) {
    return NextResponse.json({ error: "userId and action (ban|unban) required" }, { status: 400 });
  }

  if (userId === auth.userId) {
    return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { banned: action === "ban" },
    });

    // Redirect back to user detail page
    return NextResponse.redirect(new URL(`/admin/users/${userId}`, req.url));
  } catch {
    return NextResponse.json({ error: `Failed to ${action} user` }, { status: 500 });
  }
}
