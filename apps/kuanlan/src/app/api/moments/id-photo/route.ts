import { resolveIdPhotoPrint, SkuUnavailableError } from "@/catalog/skus";
import { getSessionFromRequest } from "@/lib/auth";
import { consentGap } from "@/lib/consent";
import { readFaceConsent } from "@/lib/consent.server";
import {
  Image2UnavailableError,
  idPhotoShootBrief,
  image2SizeForSku,
  shootWithImage2,
} from "@/lib/image2";
import { shootLog } from "@/lib/log";
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

  const log = shootLog(session.userId);

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
      log.warn("moments list rejected", { reason: "invalid_key" });
      return signInRequired();
    }
    if (error instanceof ResourceStoreUnavailableError) {
      log.error("moments list failed on the store", error);
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    log.error("moments list failed", error);
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
  const started = Date.now();
  const log = shootLog(session.userId);

  // Consent is asked before the ceiling on purpose: being turned away for a
  // notice you have not read should not also cost you one of today's shots.
  let gap: ReturnType<typeof consentGap>;
  try {
    gap = consentGap(await readFaceConsent(session.userId));
  } catch (error) {
    // The store is the only place consent lives. If it cannot be read we do not
    // know whether this person agreed, and a face goes to a third party either
    // way — so this refuses rather than assumes.
    log.error("consent unreadable; refusing the shoot", error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
  if (gap) {
    log.info("shoot refused for consent", { gap });
    return Response.json(
      { error: "consent_required", gap },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const allowance = await spendShootAllowance(session.userId);
  if (!allowance.allowed) {
    // At info, not warn: a ceiling doing its job is the system working. It
    // still has to be countable, because a ceiling nobody ever hits is set
    // wrong, and so is one everybody hits.
    log.info("shoot refused by ceiling", { scope: allowance.scope });
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

  const shot = shootLog(session.userId, skuId, sizeId);

  if (!(file instanceof File) || file.size === 0) {
    shot.info("shoot rejected", { reason: "portrait_required" });
    return Response.json({ error: "portrait_required" }, { status: 400 });
  }
  if (file.size > MAX_PORTRAIT_BYTES) {
    shot.info("shoot rejected", { reason: "portrait_too_large", bytes: file.size });
    return Response.json({ error: "portrait_too_large" }, { status: 413 });
  }

  // `step` is the whole point of these lines: when a shoot dies, this is the
  // difference between "it broke" and "the router timed out after 40s".
  let step: "resolve" | "router" | "compose" | "store" = "resolve";
  try {
    const { composeIdPhoto } = await import("@/lib/id-photo");
    const print = resolveIdPhotoPrint(skuId, sizeId || undefined);
    const source = Buffer.from(await file.arrayBuffer());

    step = "router";
    const frame = await shootWithImage2({
      image: source,
      prompt: idPhotoShootBrief(print),
      size: image2SizeForSku(print),
      mimeType: file.type,
    });

    step = "compose";
    const result = await composeIdPhoto({ source: frame, sku: print });

    step = "store";
    const stored = await persistIdPhotoMoment({
      userId: session.userId,
      skuId: print.id,
      sizeId: print.sizeId,
      print: result.png,
    });

    shot.info("shoot done", {
      ms: Date.now() - started,
      remainingToday: allowance.remaining,
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
    const ms = Date.now() - started;
    if (error instanceof SkuUnavailableError) {
      shot.info("shoot rejected", { reason: "sku_unavailable", ms });
      return Response.json({ error: "sku_unavailable" }, { status: 404 });
    }
    if (error instanceof Error && error.name === "InvalidPortraitError") {
      shot.info("shoot rejected", { reason: "portrait_unreadable", ms });
      return Response.json({ error: "portrait_unreadable" }, { status: 400 });
    }
    if (error instanceof InvalidResourceKeyError) {
      shot.warn("shoot rejected", { reason: "invalid_key", step, ms });
      return signInRequired();
    }
    if (error instanceof ResourceStoreUnavailableError || error instanceof Image2UnavailableError) {
      // A dependency is down. Someone should know, so this is an error even
      // though the caller gets an orderly 503.
      shot.error("shoot failed on a dependency", error, { step, ms });
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    shot.error("shoot failed", error, { step, ms });
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
  const log = shootLog(session.userId);

  try {
    await deleteIdPhotoMoment(session.userId, id);
    // Deletion is the one operation someone may later need proof of.
    log.info("moment deleted", { momentId: id });
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof InvalidResourceKeyError) {
      log.info("moment delete rejected", { reason: "invalid_key", momentId: id });
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    if (error instanceof ResourceStoreUnavailableError) {
      log.error("moment delete failed on the store", error, { momentId: id });
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    log.error("moment delete failed", error, { momentId: id });
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
