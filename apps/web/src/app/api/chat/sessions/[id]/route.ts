import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Load a chat session by id. Returns full message payload.
 * Strict ownership check — sessions are scoped to (org, user).
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await getAuth();
  if (!auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const session = await db.chatSession.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      title: true,
      mode: true,
      messages: true,
      messageCount: true,
      lastMessageAt: true,
      createdAt: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.userId !== auth.userId || session.organizationId !== auth.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ session });
}

/**
 * Hard-delete a chat session. Cascades nothing (messages are inline JSONB).
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await getAuth();
  if (!auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const existing = await db.chatSession.findUnique({
    where: { id },
    select: { userId: true, organizationId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.userId !== auth.userId || existing.organizationId !== auth.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.chatSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
