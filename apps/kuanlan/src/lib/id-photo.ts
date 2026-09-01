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

function subjectBox(width: number, height: number, headRatio: number) {
  const subjectHeight = Math.round(height * headRatio);
  const subjectWidth = Math.min(width, Math.round(subjectHeight * 0.78));
  const left = Math.round((width - subjectWidth) / 2);
  const top = Math.round((height - subjectHeight) * 0.28);
  return { subjectWidth, subjectHeight, left, top };
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
  const box = subjectBox(width, height, input.sku.headRatio);

  try {
    const subject = await sharp(input.source)
      .rotate()
      .flatten({ background })
      .resize(box.subjectWidth, box.subjectHeight, {
        fit: "cover",
        position: "attention",
      })
      .png()
      .toBuffer();

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
