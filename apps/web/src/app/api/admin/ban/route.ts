import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasPermission, resolveRole } from "@/lib/permissions";

export async function POST(req: Request) {
  const { sessionClaims, userId: currentUserId } = await auth();
  const role = resolveRole(sessionClaims?.org_role as string | undefined);

  if (!hasPermission(role, "admin:manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const userId = formData.get("userId") as string;
  const action = formData.get("action") as string;

  if (!userId || !["ban", "unban"].includes(action)) {
    return NextResponse.json({ error: "userId and action (ban|unban) required" }, { status: 400 });
  }

  if (userId === currentUserId) {
    return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });
  }

  try {
    const client = await clerkClient();

    if (action === "ban") {
      await client.users.banUser(userId);
    } else {
      await client.users.unbanUser(userId);
    }

    // Redirect back to user detail page
    return NextResponse.redirect(new URL(`/admin/users/${userId}`, req.url));
  } catch {
    return NextResponse.json({ error: `Failed to ${action} user` }, { status: 500 });
  }
}
