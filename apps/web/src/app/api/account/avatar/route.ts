import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const presignSchema = z.object({
  contentType: z.string().refine((value) => ALLOWED_TYPES.has(value), {
    message: "Unsupported content type.",
  }),
  contentLength: z
    .number()
    .int()
    .positive()
    .max(MAX_AVATAR_SIZE_BYTES, "File exceeds the 2MB limit.")
    .optional(),
});

const finalizeSchema = z.object({
  key: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("user-avatars/"), {
      message: "Invalid avatar key.",
    }),
});

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

/**
 * Resolve a public CDN-style URL from a storage key. If `UPLOADS_PUBLIC_BASE_URL`
 * is configured, the key is prefixed with it; otherwise the key itself is
 * returned (the consumer can resolve it through `/api/uploads/[key]`).
 */
function resolveAvatarUrl(key: string): string {
  const baseUrl = process.env.UPLOADS_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (baseUrl) return `${baseUrl}/${key}`;
  return `/api/uploads/${encodeURIComponent(key)}`;
}

function buildPresignedUpload(key: string, contentType: string) {
  const baseUrl = process.env.UPLOADS_BASE_URL?.replace(/\/+$/, "") ?? "";
  const url = baseUrl ? `${baseUrl}/${key}` : `/api/uploads/${encodeURIComponent(key)}`;
  return {
    url,
    method: "PUT" as const,
    headers: { "content-type": contentType },
    key,
  };
}

function isManagedAvatarKey(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("user-avatars/");
}

async function deleteManagedAvatarKey(key: string | null | undefined) {
  if (!isManagedAvatarKey(key)) return;
  try {
    const { getUploadProvider } = await import("@nebutra/uploads");
    const provider = await getUploadProvider();
    await provider.deleteFile("user-avatars", key);
  } catch (error) {
    logger.error("[account:avatar] Failed to delete avatar object", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * POST /api/account/avatar
 *
 * Two modes selected by request body:
 *   - `{ contentType, contentLength? }` → presign step. Returns `{ url, method, headers, key }`.
 *   - `{ key }` → finalize step. Persists the storage key and returns the new avatar URL.
 */
export async function POST(request: Request) {
  try {
    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (body && typeof body.key === "string") {
      const parsed = finalizeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid avatar key." },
          { status: 400 },
        );
      }
      if (!parsed.data.key.startsWith(`user-avatars/${authState.userId}/`)) {
        return NextResponse.json(
          { error: "Avatar key does not match this user." },
          { status: 400 },
        );
      }

      const previous = await db.user.findUnique({
        where: { id: authState.userId },
        select: { avatarUrl: true },
      });

      const updated = await db.user.update({
        where: { id: authState.userId },
        data: { avatarUrl: parsed.data.key },
        select: { id: true, name: true, email: true, avatarUrl: true },
      });

      if (previous?.avatarUrl !== parsed.data.key) {
        await deleteManagedAvatarKey(previous?.avatarUrl);
      }

      return NextResponse.json({
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          avatarUrl: resolveAvatarUrl(parsed.data.key),
        },
        avatarUrl: resolveAvatarUrl(parsed.data.key),
      });
    }

    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const ext = extensionFor(parsed.data.contentType);
    const key = `user-avatars/${authState.userId}/${Date.now()}.${ext}`;
    const upload = buildPresignedUpload(key, parsed.data.contentType);
    return NextResponse.json(upload);
  } catch (error) {
    logger.error("[account:avatar] Failed to handle avatar upload", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to handle avatar upload." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const previous = await db.user.findUnique({
      where: { id: authState.userId },
      select: { avatarUrl: true },
    });

    const updated = await db.user.update({
      where: { id: authState.userId },
      data: { avatarUrl: null },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    await deleteManagedAvatarKey(previous?.avatarUrl);

    return NextResponse.json({
      user: updated,
      avatarUrl: null,
    });
  } catch (error) {
    logger.error("[account:avatar] Failed to delete avatar", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to delete avatar." }, { status: 500 });
  }
}
