import sharp from "sharp";
import {
  type IdPhotoBackground,
  type IdPhotoSku,
  SkuUnavailableError,
  skuPixelSize,
} from "@/catalog/skus";

export const MAX_PORTRAIT_BYTES = 12 * 1024 * 1024;

export const ID_PHOTO_BACKGROUNDS: Record<IdPhotoBackground, { r: number; g: number; b: number }> =
  {
    white: { r: 255, g: 255, b: 255 },
    blue: { r: 67, g: 142, b: 219 },
    red: { r: 217, g: 0, b: 27 },
    smoke: { r: 126, g: 134, b: 145 },
    light: { r: 179, g: 178, b: 179 },
    studio: { r: 42, g: 64, b: 102 },
  };

export class InvalidPortraitError extends Error {
  constructor(message = "invalid_portrait") {
    super(message);
    this.name = "InvalidPortraitError";
  }
}

export type IdPhotoResult = {
  png: Buffer;
  width: number;
  height: number;
  dpi: number;
  skuId: string;
};

function subjectBox(sku: IdPhotoSku, width: number, height: number) {
  if (sku.look === "linkedin") {
    return {
      subjectWidth: width,
      subjectHeight: height,
      left: 0,
      top: 0,
      fit: "cover" as const,
    };
  }

  const subjectHeight = Math.round(height * sku.headRatio);
  const subjectWidth = Math.min(width, Math.round(subjectHeight * 0.78));
  const left = Math.round((width - subjectWidth) / 2);
  const top = Math.round((height - subjectHeight) * 0.28);
  return { subjectWidth, subjectHeight, left, top, fit: "contain" as const };
}

async function fitSubject(
  source: Buffer,
  box: { subjectWidth: number; subjectHeight: number; fit: "cover" | "contain" },
  background: { r: number; g: number; b: number },
): Promise<Buffer> {
  const rotated = sharp(source).rotate();
  const sourceMeta = await rotated.metadata();
  let prepared = await rotated.toBuffer();

  try {
    const trimmed = sharp(prepared).trim({
      background: { ...background, alpha: 1 },
      threshold: 24,
    });
    const trimmedMeta = await trimmed.metadata();
    const sourceArea = (sourceMeta.width ?? 1) * (sourceMeta.height ?? 1);
    const trimmedArea = (trimmedMeta.width ?? 0) * (trimmedMeta.height ?? 0);
    if (trimmedArea > sourceArea * 0.15) {
      const pad = Math.round((trimmedMeta.height ?? 1) * 0.14);
      prepared = await trimmed
        .extend({
          top: pad,
          bottom: Math.round(pad * 0.35),
          left: Math.round(pad * 0.18),
          right: Math.round(pad * 0.18),
          background,
        })
        .toBuffer();
    }
  } catch {
    // Keep the rotated source when trim cannot find a background border.
  }

  return sharp(prepared)
    .flatten({ background })
    .resize(box.subjectWidth, box.subjectHeight, {
      fit: box.fit,
      background,
      position: box.fit === "cover" ? "top" : "centre",
    })
    .png()
    .toBuffer();
}

export async function composeIdPhoto(input: {
  source: Buffer;
  sku: IdPhotoSku;
}): Promise<IdPhotoResult> {
  if (!input.sku.enabled || input.sku.kind !== "id-photo") {
    throw new SkuUnavailableError(input.sku.id);
  }
  if (input.source.byteLength === 0 || input.source.byteLength > MAX_PORTRAIT_BYTES) {
    throw new InvalidPortraitError("portrait_size");
  }

  const { width, height } = skuPixelSize(input.sku);
  const background = ID_PHOTO_BACKGROUNDS[input.sku.background];
  const box = subjectBox(input.sku, width, height);

  try {
    const subject = await fitSubject(input.source, box, background);

    const png = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background,
      },
    })
      .composite([{ input: subject, left: box.left, top: box.top }])
      .withMetadata({ density: input.sku.dpi })
      .png()
      .toBuffer();

    return {
      png,
      width,
      height,
      dpi: input.sku.dpi,
      skuId: input.sku.id,
    };
  } catch (error) {
    if (error instanceof SkuUnavailableError || error instanceof InvalidPortraitError) {
      throw error;
    }
    throw new InvalidPortraitError("portrait_unreadable");
  }
}
