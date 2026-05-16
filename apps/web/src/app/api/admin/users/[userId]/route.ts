import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().optional(),
  emailVerified: z.boolean().optional(),
});

async function authorizeAdmin(scope: "admin:manage_users") {
  const auth = await getAuth();
  if (!auth.isSignedIn || !auth.userId) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, scope)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { response: null };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await context.params;

  try {
    const auth = await authorizeAdmin("admin:manage_users");
    if (auth.response) return auth.response;

    const parsed = updateUserSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Invalid user update payload." }, { status: 400 });
    }

    const { emailVerified, ...userData } = parsed.data;
    const updated = await db.user.update({
      where: { id: userId },
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
      },
    });

    const authUserUpdate = {
      ...(typeof userData.email === "string" ? { email: userData.email } : {}),
      ...(typeof userData.name === "string" ? { name: userData.name } : {}),
      ...(typeof emailVerified === "boolean" ? { emailVerified } : {}),
    };
    if (Object.keys(authUserUpdate).length > 0) {
      await db.authUser.updateMany({
        where: { id: userId },
        data: authUserUpdate,
      });
    }

    return NextResponse.json({
      user: {
        ...updated,
        ...(typeof emailVerified === "boolean" ? { emailVerified } : {}),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[admin.users] Failed to update user", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
