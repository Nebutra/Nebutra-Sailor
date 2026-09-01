import { skuSampleSrc } from "@/lib/resources";

export const ID_PHOTO_KIND = "id-photo" as const;
export const ID_PHOTO_PARENT_SKU_ID = "cn-2in-white";

export type IdPhotoBackground = "white" | "blue" | "red";

export type IdPhotoSku = {
  id: string;
  kind: typeof ID_PHOTO_KIND;
  enabled: boolean;
  title: string;
  subtitle: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  background: IdPhotoBackground;
  headRatio: number;
};

export type KuanlanSku = IdPhotoSku;

export class SkuUnavailableError extends Error {
  readonly skuId: string;

  constructor(skuId: string) {
    super(`sku_unavailable:${skuId}`);
    this.name = "SkuUnavailableError";
    this.skuId = skuId;
  }
}

/**
 * Operator catalog. Flip `enabled` to open or close a spec.
 * Do not add travel / wardrobe / photoshoot SKUs here until they are real.
 */
export const SKUS: readonly KuanlanSku[] = [
  {
    id: "cn-1in-white",
    kind: ID_PHOTO_KIND,
    enabled: true,
    title: "一寸",
    subtitle: "白底",
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    background: "white",
    headRatio: 0.7,
  },
  {
    id: "cn-2in-white",
    kind: ID_PHOTO_KIND,
    enabled: true,
    title: "二寸",
    subtitle: "白底",
    widthMm: 35,
    heightMm: 49,
    dpi: 300,
    background: "white",
    headRatio: 0.7,
  },
  {
    id: "cn-2in-blue",
    kind: ID_PHOTO_KIND,
    enabled: true,
    title: "二寸",
    subtitle: "蓝底",
    widthMm: 35,
    heightMm: 49,
    dpi: 300,
    background: "blue",
    headRatio: 0.7,
  },
  {
    id: "passport-cn",
    kind: ID_PHOTO_KIND,
    enabled: true,
    title: "护照",
    subtitle: "白底",
    widthMm: 33,
    heightMm: 48,
    dpi: 300,
    background: "white",
    headRatio: 0.7,
  },
  {
    id: "visa-us",
    kind: ID_PHOTO_KIND,
    enabled: true,
    title: "美签",
    subtitle: "白底方寸",
    widthMm: 51,
    heightMm: 51,
    dpi: 300,
    background: "white",
    headRatio: 0.65,
  },
  {
    id: "cn-1in-blue",
    kind: ID_PHOTO_KIND,
    enabled: false,
    title: "一寸",
    subtitle: "蓝底",
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    background: "blue",
    headRatio: 0.7,
  },
];

export function skuPixelSize(sku: Pick<IdPhotoSku, "widthMm" | "heightMm" | "dpi">): {
  width: number;
  height: number;
} {
  return {
    width: Math.round((sku.widthMm / 25.4) * sku.dpi),
    height: Math.round((sku.heightMm / 25.4) * sku.dpi),
  };
}

export function listPublicSkus(): IdPhotoSku[] {
  return SKUS.filter((sku) => sku.enabled && sku.kind === ID_PHOTO_KIND);
}

export function getEnabledSku(id: string): IdPhotoSku {
  const sku = SKUS.find((item) => item.id === id);
  if (!sku || !sku.enabled || sku.kind !== ID_PHOTO_KIND) {
    throw new SkuUnavailableError(id);
  }
  return sku;
}

export function toPublicSku(sku: IdPhotoSku) {
  const pixels = skuPixelSize(sku);
  return {
    id: sku.id,
    kind: sku.kind,
    title: sku.title,
    subtitle: sku.subtitle,
    widthMm: sku.widthMm,
    heightMm: sku.heightMm,
    dpi: sku.dpi,
    background: sku.background,
    widthPx: pixels.width,
    heightPx: pixels.height,
    sample: skuSampleSrc(sku.id),
  };
}

export function listIdPhotoCreateTiles() {
  return listPublicSkus().map((sku) => {
    const pub = toPublicSku(sku);
    return {
      ...pub,
      href: `/create/id-photo?sku=${sku.id}`,
    };
  });
}

export function idPhotoParentTile() {
  const live = listPublicSkus();
  const sku = live.find((item) => item.id === ID_PHOTO_PARENT_SKU_ID) ?? live[0];
  if (!sku) {
    throw new SkuUnavailableError(ID_PHOTO_PARENT_SKU_ID);
  }
  const pub = toPublicSku(sku);
  return {
    ...pub,
    href: "/create/id-photo",
    title: "领证照",
    subtitle: `先留下一张可以用的 · ${[...new Set(live.map((item) => item.title))].join(" / ")}`,
  };
}
