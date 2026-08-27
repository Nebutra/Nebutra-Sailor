import { randomUUID } from "node:crypto";
import { brand } from "@nebutra/brand/metadata";
import { getServerClient } from "@nebutra/sanity/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest, getUserById } from "@/lib/auth";

const querySchema = z.object({
  language: z.enum(["en", "zh"]),
  slug: z.string().min(1).max(160),
  translationKey: z.string().min(1).max(200),
});

const postSchema = querySchema.extend({
  body: z.string().trim().min(2).max(1200),
});

function viewerFromUser(user: Awaited<ReturnType<typeof getUserById>>) {
  return {
    avatarUrl: user?.imageUrl ?? null,
    email: user?.email ?? "",
    isSignedIn: Boolean(user?.id),
    name: user?.name ?? user?.email ?? "",
  };
}

async function getViewer(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session?.userId) return { user: null, viewer: viewerFromUser(null) };
  const user = await getUserById(session.userId);
  return { user, viewer: viewerFromUser(user) };
}

async function getLikeState(input: z.infer<typeof querySchema>, userId?: string) {
  const client = getServerClient();
  const [likeCount, saveCount, viewerLikeId, viewerSaveId] = await Promise.all([
    client.fetch(
      `count(*[
        _type == "blogReaction" &&
        translationKey == $translationKey &&
        postSlug == $slug &&
        language == $language &&
        kind == "like"
      ])`,
      input,
    ),
    client.fetch(
      `count(*[
        _type == "blogReaction" &&
        translationKey == $translationKey &&
        postSlug == $slug &&
        language == $language &&
        kind == "save"
      ])`,
      input,
    ),
    userId
      ? client.fetch(
          `*[
            _type == "blogReaction" &&
            translationKey == $translationKey &&
            postSlug == $slug &&
            language == $language &&
            kind == "like" &&
            authorId == $authorId
          ][0]._id`,
          { ...input, authorId: userId },
        )
      : Promise.resolve(null),
    userId
      ? client.fetch(
          `*[
            _type == "blogReaction" &&
            translationKey == $translationKey &&
            postSlug == $slug &&
            language == $language &&
            kind == "save" &&
            authorId == $authorId
          ][0]._id`,
          { ...input, authorId: userId },
        )
      : Promise.resolve(null),
  ]);

  return {
    likeCount: Number(likeCount) || 0,
    saveCount: Number(saveCount) || 0,
    viewerLiked: Boolean(viewerLikeId),
    viewerSaved: Boolean(viewerSaveId),
  };
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid blog comment query" }, { status: 400 });
  }

  const { user, viewer } = await getViewer(req);
  const client = getServerClient();
  const [comments, reactions] = await Promise.all([
    client.fetch(
      `*[
        _type == "blogComment" &&
        translationKey == $translationKey &&
        postSlug == $slug &&
        language == $language &&
        status == "approved"
      ] | order(createdAt asc) {
        "id": _id,
        body,
        authorName,
        authorImageUrl,
        createdAt
      }`,
      parsed.data,
    ),
    getLikeState(parsed.data, user?.id),
  ]);

  return NextResponse.json({ comments, reactions, viewer });
}

export async function POST(req: NextRequest) {
  const { user } = await getViewer(req);
  if (!user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid blog comment payload" }, { status: 400 });
  }

  const client = getServerClient();
  const createdAt = new Date().toISOString();
  const comment = await client.create({
    _id: `blog-comment-${randomUUID()}`,
    _type: "blogComment",
    authorEmail: user.email ?? "",
    authorId: user.id,
    authorImageUrl: user.imageUrl ?? null,
    authorName: user.name ?? user.email ?? `${brand.name} reader`,
    body: parsed.data.body,
    createdAt,
    language: parsed.data.language,
    postSlug: parsed.data.slug,
    status: "pending",
    translationKey: parsed.data.translationKey,
  });

  return NextResponse.json({
    comment: {
      id: comment._id,
      authorImageUrl: user.imageUrl ?? null,
      authorName: user.name ?? user.email ?? `${brand.name} reader`,
      body: parsed.data.body,
      createdAt,
      status: "pending",
    },
  });
}
