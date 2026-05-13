import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const KNOWN_MODES = new Set(["chat", "data", "workflow", "search"]);

const UpsertBody = z.object({
  id: z.string().min(1).max(64).optional(),
  title: z.string().min(1).max(200).optional(),
  mode: z.string().min(1).max(20).optional(),
  messages: z.array(z.unknown()).max(2000), // hard cap; UIMessage[] shape is opaque to us
});

function pickTitleFromMessages(messages: unknown[]): string {
  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) continue;
    const m = msg as Record<string, unknown>;
    if (m.role !== "user") continue;
    const parts = Array.isArray(m.parts) ? m.parts : null;
    if (!parts) continue;
    for (const part of parts) {
      if (typeof part !== "object" || part === null) continue;
      const p = part as Record<string, unknown>;
      if (p.type === "text" && typeof p.text === "string" && p.text.trim()) {
        return p.text.trim().slice(0, 80);
      }
    }
  }
  return "New chat";
}

/**
 * List recent chat sessions for the current user in the active org.
 * Returns at most 20 sessions, ordered by most-recent activity.
 * Message payloads are NOT returned — the list view only needs metadata.
 */
export async function GET() {
  const auth = await getAuth();
  if (!auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!auth.orgId) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const sessions = await db.chatSession.findMany({
      where: { organizationId: auth.orgId, userId: auth.userId },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        mode: true,
        messageCount: true,
        lastMessageAt: true,
        createdAt: true,
      },
    });
    logger.debug("[chat.sessions.GET] Listed sessions", {
      count: sessions.length,
      orgId: auth.orgId,
      userId: auth.userId,
    });
    return NextResponse.json({ sessions });
  } catch (err) {
    logger.error("[chat.sessions.GET] Failed to list sessions", {
      error: err instanceof Error ? err.message : String(err),
      orgId: auth.orgId,
      userId: auth.userId,
    });
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

/**
 * Upsert a chat session.
 *
 * Honesty contract:
 *   - The session id may be supplied by the client (idempotent upsert) or omitted
 *     (create new). We never silently change ownership: a supplied id that exists
 *     under a different user is rejected, not overwritten.
 *   - `title` is derived from the first user message if not provided.
 *   - `messageCount` is computed server-side from `messages.length`.
 */
export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!auth.orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  let body: z.infer<typeof UpsertBody>;
  try {
    body = UpsertBody.parse(await request.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    logger.warn("[chat.sessions.POST] Invalid body", {
      error: message,
      userId: auth.userId,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const mode = body.mode && KNOWN_MODES.has(body.mode) ? body.mode : "chat";
  const title = body.title?.trim() || pickTitleFromMessages(body.messages);
  const messageCount = body.messages.length;
  const now = new Date();

  // If client passed an id, verify ownership before upserting.
  if (body.id) {
    const existing = await db.chatSession.findUnique({
      where: { id: body.id },
      select: { userId: true, organizationId: true },
    });
    if (existing && (existing.userId !== auth.userId || existing.organizationId !== auth.orgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    logger.info("[chat.sessions.POST] Upserting session", {
      sessionId: body.id,
      mode,
      messageCount,
      orgId: auth.orgId,
      userId: auth.userId,
    });

    const upserted = await db.chatSession.upsert({
      where: { id: body.id },
      create: {
        id: body.id,
        organizationId: auth.orgId,
        userId: auth.userId,
        title,
        mode,
        messages: body.messages as unknown as object,
        messageCount,
        lastMessageAt: now,
      },
      update: {
        title,
        mode,
        messages: body.messages as unknown as object,
        messageCount,
        lastMessageAt: now,
      },
      select: { id: true, title: true, mode: true, lastMessageAt: true },
    });
    return NextResponse.json({ session: upserted });
  }

  const created = await db.chatSession.create({
    data: {
      organizationId: auth.orgId,
      userId: auth.userId,
      title,
      mode,
      messages: body.messages as unknown as object,
      messageCount,
      lastMessageAt: now,
    },
    select: { id: true, title: true, mode: true, lastMessageAt: true },
  });
  return NextResponse.json({ session: created });
}
