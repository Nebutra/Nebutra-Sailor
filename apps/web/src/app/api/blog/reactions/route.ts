import { createHash } from "node:crypto";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { getServerClient } from "@nebutra/sanity";
import { z } from "zod";
import { getAuth } from "@/lib/auth";

const ToggleReactionSchema = z.object({
  translationKey: z.string().min(1).max(140),
  slug: z.string().min(1).max(160),
  language: z.enum(["en", "zh"]),
  kind: z.literal("like"),
});

interface ExistingReaction {
  _id: string;
}

function getAllowedOrigin(): string | null {
  return process.env.NEBUTRA_LANDING_ORIGIN?.replace(/\/+$/, "") ?? null;
}

function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = getAllowedOrigin();
  if (!allowedOrigin) return {};
  const normalizedOrigin = origin?.replace(/\/+$/, "") ?? null;
  if (normalizedOrigin !== allowedOrigin) return {};
  return {
    "Access-Control-Allow-Origin": origin ?? allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    logger.error("[blog/reactions] failed to resolve viewer", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { userId: authState.userId, name: "", email: "", avatarUrl: null as string | null };
  }
}

function getReactionId(input: z.infer<typeof ToggleReactionSchema>, userId: string): string {
  const digest = createHash("sha256")
    .update([input.translationKey, input.slug, userId, input.kind].join("\u001f"))
    .digest("hex")
    .slice(0, 32);
  return `blogReaction.${digest}`;
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const viewer = await getViewer(request);
    if (!viewer.userId) {
      return json({ error: "Unauthorized" }, request, { status: 401 });
    }

    if (!process.env.SANITY_API_TOKEN) {
      return json({ error: "Blog reactions are not configured" }, request, { status: 503 });
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = ToggleReactionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json({ error: "Invalid request", details: parsed.error.flatten() }, request, {
        status: 400,
      });
    }

    const client = getServerClient();
    const reactionId = getReactionId(parsed.data, viewer.userId);
    const existing = await client.fetch<ExistingReaction | null>(
      `*[_id == $reactionId][0]{ _id }`,
      { reactionId },
    );
    const now = new Date().toISOString();
    let liked = false;

    if (existing?._id) {
      await client.delete(existing._id);
    } else {
      await client.createIfNotExists({
        _id: reactionId,
        _type: "blogReaction",
        translationKey: parsed.data.translationKey,
        postSlug: parsed.data.slug,
        language: parsed.data.language,
        kind: parsed.data.kind,
        authorId: viewer.userId,
        authorName: viewer.name || viewer.email || "Nebutra reader",
        authorEmail: viewer.email || null,
        authorImageUrl: viewer.avatarUrl,
        createdAt: now,
      });
      liked = true;
    }

    const likeCount = await client.fetch<number>(
      `count(*[
        _type == "blogReaction" &&
        !(_id in path("drafts.**")) &&
        kind == "like" &&
        translationKey == $translationKey &&
        postSlug == $slug
      ])`,
      parsed.data,
    );

    return json({ liked, likeCount }, request);
  } catch (error) {
    logger.error("[POST /api/blog/reactions]", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "Internal server error" }, request, { status: 500 });
  }
}
