import { getEnabledSku, SkuUnavailableError } from "@/catalog/skus";
import { composeIdPhoto, InvalidPortraitError, MAX_PORTRAIT_BYTES } from "@/lib/id-photo";
import {
  Image2UnavailableError,
  idPhotoShootBrief,
  image2SizeForSku,
  shootWithImage2,
} from "@/lib/image2";
import { ResourceStoreUnavailableError } from "@/lib/resources";
import { persistIdPhotoMoment } from "@/lib/resources.server";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const form = await request.formData();
  const skuId = String(form.get("skuId") ?? "");
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "portrait_required" }, { status: 400 });
  }
  if (file.size > MAX_PORTRAIT_BYTES) {
    return Response.json({ error: "portrait_too_large" }, { status: 413 });
  }

  try {
    const sku = getEnabledSku(skuId);
    const source = Buffer.from(await file.arrayBuffer());
    const shot = await shootWithImage2({
      image: source,
      prompt: idPhotoShootBrief(sku),
      size: image2SizeForSku(sku),
      mimeType: file.type,
    });
    const result = await composeIdPhoto({ source: shot, sku });
    const stored = await persistIdPhotoMoment({
      skuId: sku.id,
      print: result.png,
      source,
      sourceType: file.type,
    });

    return Response.json(
      {
        id: stored.id,
        skuId: sku.id,
        key: stored.key,
        url: stored.url,
        width: result.width,
        height: result.height,
        dpi: result.dpi,
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
    if (error instanceof InvalidPortraitError) {
      return Response.json({ error: "portrait_unreadable" }, { status: 400 });
    }
    if (error instanceof ResourceStoreUnavailableError || error instanceof Image2UnavailableError) {
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
