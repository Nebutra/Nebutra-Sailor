import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const accounts = await db.authAccount.findMany({
      where: { userId: authState.userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        providerId: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      accounts.map((account) => ({
        id: account.id,
        providerId: account.providerId,
        accountId: account.accountId,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    logger.error("[auth:list-accounts] Failed to load accounts", {
      userId: authState.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load linked sign-in methods." }, { status: 500 });
  }
}
