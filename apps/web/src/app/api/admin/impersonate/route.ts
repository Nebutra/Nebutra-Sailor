import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasPermission, resolveRole } from "@/lib/permissions";

export async function POST(req: Request) {
  const { sessionClaims } = await auth();
  const role = resolveRole(sessionClaims?.org_role as string | undefined);

  if (!hasPermission(role, "admin:impersonate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const userId = formData.get("userId") as string;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const actor = await client.users.getUser(userId);

    if (!actor) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Clerk impersonation is handled client-side via the Clerk dashboard
    // or via the Clerk Backend API with actor tokens.
    // For now, redirect to the Clerk dashboard impersonation URL.
    const clerkDashboardUrl = `https://dashboard.clerk.com/apps/${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.split("_")[1] ?? "app"}/instances/default/users/${userId}`;

    return NextResponse.redirect(clerkDashboardUrl);
  } catch {
    return NextResponse.json({ error: "Failed to impersonate user" }, { status: 500 });
  }
}
