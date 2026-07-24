import { randomUUID } from "node:crypto";
import { getServerClient } from "@nebutra/sanity/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest, getUserById } from "@/lib/auth";

const reactionSchema = z.object({
  kind: z.enum(["like", "save"]),
  language: z.enum(["en", "zh"]),
  slug: z.string().min(1).max(160),
  translationKey: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = reactionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid blog reaction payload" }, { status: 400 });
  }

  const client = getServerClient();
  const existingId = await client.fetch(
    `*[
      _type == "blogReaction" &&
      translationKey == $translationKey &&
      postSlug == $slug &&
      language == $language &&
      kind == $kind &&
      authorId == $authorId
    ][0]._id`,
    { ...parsed.data, authorId: user.id },
  );

  let active = false;
  if (existingId) {
    await client.delete(existingId);
  } else {
    await client.create({
      _id: `blog-reaction-${randomUUID()}`,
      _type: "blogReaction",
      authorEmail: user.email ?? "",
      authorId: user.id,
      authorImageUrl: user.imageUrl ?? null,
      authorName: user.name ?? user.email ?? "Nebutra reader",
      createdAt: new Date().toISOString(),
      kind: parsed.data.kind,
      language: parsed.data.language,
      postSlug: parsed.data.slug,
      translationKey: parsed.data.translationKey,
    });
    active = true;
  }

  const count = await client.fetch(
    `count(*[
      _type == "blogReaction" &&
      translationKey == $translationKey &&
      postSlug == $slug &&
      language == $language &&
      kind == $kind
    ])`,
    parsed.data,
  );

  if (parsed.data.kind === "like") {
    return NextResponse.json({ liked: active, likeCount: Number(count) || 0 });
  }

  return NextResponse.json({ saved: active, saveCount: Number(count) || 0 });
}
