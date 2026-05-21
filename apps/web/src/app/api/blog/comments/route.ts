import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { getServerClient } from "@nebutra/sanity";
import { z } from "zod";
import { getAuth } from "@/lib/auth";

const MAX_COMMENT_LENGTH = 1200;
function getAllowedOrigin(): string | null {
  return process.env.NEBUTRA_LANDING_ORIGIN?.replace(/\/+$/, "") ?? null;
}

const ListCommentsSchema = z.object({
  translationKey: z.string().min(1).max(140),
  slug: z.string().min(1).max(160),
  language: z.enum(["en", "zh"]).optional(),
});

const CreateCommentSchema = z.object({
  translationKey: z.string().min(1).max(140),
  slug: z.string().min(1).max(160),
  language: z.enum(["en", "zh"]),
  body: z.string().min(2).max(MAX_COMMENT_LENGTH),
});

interface SanityComment {
  _id: string;
  body: string;
  authorName?: string | null;
  authorImageUrl?: string | null;
  createdAt?: string | null;
}

interface ReactionSummary {
  likeCount?: number | null;
  viewerLiked?: boolean | null;
}

function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = getAllowedOrigin();
  if (!allowedOrigin) return {};
  const normalizedOrigin = origin?.replace(/\/+$/, "") ?? null;
  if (normalizedOrigin !== allowedOrigin) return {};
  return {
    "Access-Control-Allow-Origin": origin ?? allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

function json(data: unknown, request: Request, init?: ResponseInit): Response {
  const response = Response.json(data, init);
  response.headers.set("Cache-Control", "private, no-store");
  for (const [key, value] of Object.entries(buildCorsHeaders(request.headers.get("origin")))) {
    response.headers.set(key, value);
  }
  return response;
}

function normalizeBody(input: string): string {
  return Array.from(input)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("")
    .trim();
}

async function getViewer(request: Request) {
  const authState = await getAuth(request);
  if (!authState.userId) {
    return { userId: null, name: "", email: "", avatarUrl: null as string | null };
  }

  try {
    const sdk = await createAuth({ provider: getConfiguredAuthProvider() });
    const user = await sdk.getUser(authState.userId);
    return {
      userId: authState.userId,
      name: user?.name ?? "",
      email: user?.email ?? "",
      avatarUrl: user?.imageUrl ?? null,
    };
  } catch (error) {
    logger.error("[blog/comments] failed to resolve viewer", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { userId: authState.userId, name: "", email: "", avatarUrl: null as string | null };
  }
}

function serializeComment(comment: SanityComment) {
  return {
    id: comment._id,
    body: comment.body,
    authorName: comment.authorName ?? "Nebutra reader",
    authorImageUrl: comment.authorImageUrl ?? null,
    createdAt: comment.createdAt ?? null,
  };
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parsed = ListCommentsSchema.safeParse({
      translationKey: url.searchParams.get("translationKey"),
      slug: url.searchParams.get("slug"),
      language: url.searchParams.get("language") ?? undefined,
    });

    if (!parsed.success) {
      return json({ error: "Invalid request", details: parsed.error.flatten() }, request, {
        status: 400,
      });
    }

    const viewer = await getViewer(request);
    const [comments, reactions] = await Promise.all([
      getServerClient().fetch<SanityComment[]>(
        `*[
          _type == "blogComment" &&
          !(_id in path("drafts.**")) &&
          status == "approved" &&
          translationKey == $translationKey &&
          postSlug == $slug
        ] | order(createdAt asc) {
          _id,
          body,
          authorName,
          authorImageUrl,
          createdAt
        }`,
        parsed.data,
      ),
      getServerClient().fetch<ReactionSummary>(
        `{
          "likeCount": count(*[
            _type == "blogReaction" &&
            !(_id in path("drafts.**")) &&
            kind == "like" &&
            translationKey == $translationKey &&
            postSlug == $slug
          ]),
          "viewerLiked": count(*[
            _type == "blogReaction" &&
            !(_id in path("drafts.**")) &&
            kind == "like" &&
            translationKey == $translationKey &&
            postSlug == $slug &&
            authorId == $viewerId
          ]) > 0
        }`,
        { ...parsed.data, viewerId: viewer.userId ?? "" },
      ),
    ]);

    return json(
      {
        comments: comments.map(serializeComment),
        viewer: {
          isSignedIn: Boolean(viewer.userId),
          name: viewer.name,
          email: viewer.email,
          avatarUrl: viewer.avatarUrl,
        },
        reactions: {
          likeCount: reactions.likeCount ?? 0,
          viewerLiked: Boolean(viewer.userId && reactions.viewerLiked),
        },
      },
      request,
    );
  } catch (error) {
    logger.error("[GET /api/blog/comments]", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "Internal server error" }, request, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const viewer = await getViewer(request);
    if (!viewer.userId) {
      return json({ error: "Unauthorized" }, request, { status: 401 });
    }

    if (!process.env.SANITY_API_TOKEN) {
      return json({ error: "Comment publishing is not configured" }, request, { status: 503 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = CreateCommentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json({ error: "Invalid request", details: parsed.error.flatten() }, request, {
        status: 400,
      });
    }

    const body = normalizeBody(parsed.data.body);
    if (body.length < 2) {
      return json({ error: "Comment body is empty" }, request, { status: 400 });
    }

    const now = new Date().toISOString();
    const comment = await getServerClient().create({
      _type: "blogComment",
      translationKey: parsed.data.translationKey,
      postSlug: parsed.data.slug,
      language: parsed.data.language,
      body,
      status: "pending",
      authorId: viewer.userId,
      authorName: viewer.name || viewer.email || "Nebutra reader",
      authorEmail: viewer.email || null,
      authorImageUrl: viewer.avatarUrl,
      createdAt: now,
    });

    return json(
      {
        comment: {
          id: comment._id,
          body,
          status: "pending",
          createdAt: comment.createdAt ?? now,
        },
      },
      request,
      { status: 201 },
    );
  } catch (error) {
    logger.error("[POST /api/blog/comments]", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "Internal server error" }, request, { status: 500 });
  }
}
