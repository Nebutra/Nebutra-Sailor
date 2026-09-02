import sharp from "sharp";
import { GARMENT_STILL } from "@/catalog/skus";

export const GARMENT_SMOKE_RGB = { r: 0x7e, g: 0x86, b: 0x91 } as const;

export type GarmentStillSize = {
  width: number;
  height: number;
};

export function garmentStillSourceFile(id: string): string {
  return `wardrobe-${id}.jpg`;
}

export async function composeGarmentStill(
  input: Buffer,
  size: GarmentStillSize = GARMENT_STILL,
): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(size.width, size.height, {
      fit: "cover",
      position: "top",
    })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();
}
