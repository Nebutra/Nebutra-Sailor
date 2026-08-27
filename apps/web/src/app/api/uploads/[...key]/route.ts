import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ key?: string[] }>;
};

const ALLOWED_BUCKETS = new Set(["user-avatars", "org-logos"]);
const SIGNED_URL_TTL_SECONDS = 60;

function normalizeKey(parts: string[] | undefined): string | null {
  const joined = (parts ?? []).join("/");
  if (!joined) return null;
  try {
    return decodeURIComponent(joined).replace(/^\/+/, "");
  } catch {
    return null;
  }
}

function bucketForKey(key: string): string | null {
  const bucket = key.split("/")[0];
  return ALLOWED_BUCKETS.has(bucket) ? bucket : null;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const key = normalizeKey((await context.params).key);
  if (!key) {
    return NextResponse.json({ error: "Upload key is required." }, { status: 400 });
  }

  const bucket = bucketForKey(key);
  if (!bucket) {
    return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  }

  try {
    const { getUploadProvider } = await import("@nebutra/uploads");
    const provider = await getUploadProvider();
    const signedUrl = await provider.getDownloadUrl(bucket, key, SIGNED_URL_TTL_SECONDS);
    const response = NextResponse.redirect(signedUrl, 307);
    response.headers.set("cache-control", "private, max-age=60");
    return response;
  } catch (error) {
    logger.error("[uploads.proxy] Failed to resolve signed upload URL", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load upload." }, { status: 500 });
  }
}
