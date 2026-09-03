import { resolveIdPhotoPrint, SkuUnavailableError } from "@/catalog/skus";
import { getSessionFromRequest } from "@/lib/auth";
import {
  Image2UnavailableError,
  idPhotoShootBrief,
  image2SizeForSku,
  shootWithImage2,
} from "@/lib/image2";
import { InvalidResourceKeyError, ResourceStoreUnavailableError } from "@/lib/resources";
import {
  deleteIdPhotoMoment,
  listIdPhotoMoments,
  persistIdPhotoMoment,
} from "@/lib/resources.server";
import { spendShootAllowance } from "@/lib/shoot-limit";

// Keep this number here so GET / unsigned POST never load sharp.
const MAX_PORTRAIT_BYTES = 12 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 180;

function signInRequired() {
  return Response.json({ error: "sign_in_required" }, { status: 401 });
}

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return signInRequired();
  }

  try {
    const { moments, total } = await listIdPhotoMoments(session.userId);
    return Response.json(
      { moments, total },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof InvalidResourceKeyError) {
      return signInRequired();
    }
    if (error instanceof ResourceStoreUnavailableError) {
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return signInRequired();
  }

  // Ahead of reading the body: a refused shot should not cost us a 12 MB buffer,
  // and nothing below this line is free once it starts.
  const allowance = await spendShootAllowance(session.userId);
  if (!allowance.allowed) {
    return Response.json(
      { error: "shoot_limit", scope: allowance.scope },
      {
        status: 429,
        headers: {
          "Retry-After": String(allowance.retryAfter ?? 60),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const form = await request.formData();
  const skuId = String(form.get("skuId") ?? "");
  const sizeId = String(form.get("sizeId") ?? "");
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "portrait_required" }, { status: 400 });
  }
  if (file.size > MAX_PORTRAIT_BYTES) {
    return Response.json({ error: "portrait_too_large" }, { status: 413 });
  }

  try {
    const { composeIdPhoto } = await import("@/lib/id-photo");
    const print = resolveIdPhotoPrint(skuId, sizeId || undefined);
    const source = Buffer.from(await file.arrayBuffer());
    const shot = await shootWithImage2({
      image: source,
      prompt: idPhotoShootBrief(print),
      size: image2SizeForSku(print),
      mimeType: file.type,
    });
    const result = await composeIdPhoto({ source: shot, sku: print });
    const stored = await persistIdPhotoMoment({
      userId: session.userId,
      skuId: print.id,
      sizeId: print.sizeId,
      print: result.png,
    });

    return Response.json(
      {
        id: stored.id,
        skuId: print.id,
        sizeId: print.sizeId,
        key: stored.key,
        url: stored.url,
        width: result.width,
        height: result.height,
        dpi: result.dpi,
        remainingToday: allowance.remaining,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof SkuUnavailableError) {
      return Response.json({ error: "sku_unavailable" }, { status: 404 });
    }
    if (error instanceof Error && error.name === "InvalidPortraitError") {
      return Response.json({ error: "portrait_unreadable" }, { status: 400 });
    }
    if (error instanceof InvalidResourceKeyError) {
      return signInRequired();
    }
    if (error instanceof ResourceStoreUnavailableError || error instanceof Image2UnavailableError) {
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}

/**
 * Take a Moment off the shelf, for good.
 *
 * The id is the only thing the caller supplies; the prefix comes from the
 * session, so this can only ever reach the caller's own shelf.
 */
export async function DELETE(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return signInRequired();
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";

  try {
    await deleteIdPhotoMoment(session.userId, id);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof InvalidResourceKeyError) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    if (error instanceof ResourceStoreUnavailableError) {
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
