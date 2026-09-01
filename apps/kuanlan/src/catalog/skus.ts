import { BRAND } from "@/lib/brand";
import { skuSampleSrc, wardrobeSampleSrc } from "@/lib/resources";

export const GARMENT_STILL = { width: 800, height: 1067 } as const;

export const GARMENT_KIND = "garment" as const;
export const ID_PHOTO_KIND = "id-photo" as const;
export const ID_PHOTO_PARENT_SKU_ID = "linkedin-smoke";
export const PLATFORM_BRAND = BRAND.skuMark;

export type SkuOrigin = "platform" | "user";

export type SkuBrand = {
  origin: SkuOrigin;
  brand: string;
};

export type GarmentDoor = "outer" | "top" | "bottom" | "onepiece" | "shoes" | "accent";
export type GarmentSlot = "base" | "top" | "cover" | "bottom" | "shoes" | "accent";
export type GarmentId = "blazer" | "knit" | "oxford";
export type GarmentMeasureKey =
  | "length"
  | "inseam"
  | "chest"
  | "sleeve"
  | "shoulder"
  | "waist"
  | "hip";

export const GARMENT_MEASURE_LABELS: Record<GarmentMeasureKey, string> = {
  length: "衣长",
  inseam: "裤长",
  chest: "胸围",
  sleeve: "袖长",
  shoulder: "肩宽",
  waist: "腰围",
  hip: "臀围",
};

export const GARMENT_GROUNDS = {
  paper: "var(--canvas)",
  white: "#ffffff",
  smoke: "#7e8691",
  ink: "#111111",
} as const;

export type GarmentGround = keyof typeof GARMENT_GROUNDS;

export type GarmentSpec = {
  size: string;
  color: string;
  material: string;
  measures: Partial<Record<GarmentMeasureKey, number>>;
};

export type IdPhotoLook = "linkedin" | "id-card";
export type IdPhotoBackground = "white" | "blue" | "red" | "smoke" | "light";

export type GarmentSku = SkuBrand & {
  id: GarmentId;
  kind: typeof GARMENT_KIND;
  enabled: boolean;
  title: string;
  line: string;
  door: GarmentDoor;
  slots: readonly GarmentSlot[];
  spec: GarmentSpec;
};

export type IdPhotoSku = SkuBrand & {
  id: string;
  kind: typeof ID_PHOTO_KIND;
  look: IdPhotoLook;
  enabled: boolean;
  title: string;
  subtitle: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  background: IdPhotoBackground;
  garmentId?: GarmentId;
  headRatio: number;
};

export type KuanlanSku = GarmentSku | IdPhotoSku;

export class SkuUnavailableError extends Error {
  readonly skuId: string;

  constructor(skuId: string) {
    super(`sku_unavailable:${skuId}`);
    this.name = "SkuUnavailableError";
    this.skuId = skuId;
  }
}

/**
 * Platform-listed SKUs always seal to KUANLAN©️.
 * User-uploaded SKUs (not open yet) keep whatever brand they carry.
 */
export function sealSkuBrand<T extends SkuBrand>(sku: T): T {
  if (sku.origin === "platform") {
    return { ...sku, brand: PLATFORM_BRAND };
  }
  return { ...sku, brand: sku.brand.trim() };
}

function listed(sku: Omit<GarmentSku, keyof SkuBrand>): GarmentSku;
function listed(sku: Omit<IdPhotoSku, keyof SkuBrand>): IdPhotoSku;
function listed(
  sku: Omit<GarmentSku, keyof SkuBrand> | Omit<IdPhotoSku, keyof SkuBrand>,
): KuanlanSku {
  return { ...sku, origin: "platform", brand: PLATFORM_BRAND };
}

/**
 * Operator catalog. Flip `enabled` to open or close a SKU.
 * Garments are first-class SKUs. Shoot specs may point at a garment.
 * Do not add a shoot SKU until it has a real open path.
 */
export const SKUS: readonly KuanlanSku[] = [
  listed({
    id: "blazer",
    kind: GARMENT_KIND,
    enabled: true,
    title: "西装",
    line: "外套。可以罩在衬衫或针织外面。",
    door: "outer",
    slots: ["cover"],
    spec: {
      size: "M",
      color: "藏青",
      material: "羊毛",
      measures: { length: 74, chest: 108, sleeve: 62, shoulder: 46 },
    },
  }),
  listed({
    id: "knit",
    kind: GARMENT_KIND,
    enabled: true,
    title: "针织",
    line: "上装。可以单独穿，也可以进外套。",
    door: "top",
    slots: ["base", "top"],
    spec: {
      size: "M",
      color: "炭灰",
      material: "美丽诺羊毛",
      measures: { length: 68, chest: 104, sleeve: 60, shoulder: 44 },
    },
  }),
  listed({
    id: "oxford",
    kind: GARMENT_KIND,
    enabled: true,
    title: "衬衫",
    line: "上装。可以单独穿，也可以进针织或外套。",
    door: "top",
    slots: ["base", "top"],
    spec: {
      size: "M",
      color: "海军蓝",
      material: "棉",
      measures: { length: 72, chest: 106, sleeve: 61, shoulder: 45 },
    },
  }),
  listed({
    id: "linkedin-smoke",
    kind: ID_PHOTO_KIND,
    look: "linkedin",
    enabled: true,
    title: "领证照",
    subtitle: "灰蓝 · 西装",
    widthMm: 40,
    heightMm: 50,
    dpi: 300,
    background: "smoke",
    garmentId: "blazer",
    headRatio: 0.72,
  }),
  listed({
    id: "linkedin-smoke-knit",
    kind: ID_PHOTO_KIND,
    look: "linkedin",
    enabled: true,
    title: "领证照",
    subtitle: "灰蓝 · 针织",
    widthMm: 40,
    heightMm: 50,
    dpi: 300,
    background: "smoke",
    garmentId: "knit",
    headRatio: 0.72,
  }),
  listed({
    id: "linkedin-smoke-oxford",
    kind: ID_PHOTO_KIND,
    look: "linkedin",
    enabled: true,
    title: "领证照",
    subtitle: "灰蓝 · 衬衫",
    widthMm: 40,
    heightMm: 50,
    dpi: 300,
    background: "smoke",
    garmentId: "oxford",
    headRatio: 0.72,
  }),
  listed({
    id: "linkedin-light",
    kind: ID_PHOTO_KIND,
    look: "linkedin",
    enabled: true,
    title: "领证照",
    subtitle: "浅灰 · 西装",
    widthMm: 40,
    heightMm: 50,
    dpi: 300,
    background: "light",
    garmentId: "blazer",
    headRatio: 0.72,
  }),
  listed({
    id: "cn-1in-white",
    kind: ID_PHOTO_KIND,
    look: "id-card",
    enabled: true,
    title: "一寸",
    subtitle: "白底",
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    background: "white",
    headRatio: 0.7,
  }),
  listed({
    id: "cn-2in-white",
    kind: ID_PHOTO_KIND,
    look: "id-card",
    enabled: true,
    title: "二寸",
    subtitle: "白底",
    widthMm: 35,
    heightMm: 49,
    dpi: 300,
    background: "white",
    headRatio: 0.7,
  }),
  listed({
    id: "cn-2in-blue",
    kind: ID_PHOTO_KIND,
    look: "id-card",
    enabled: true,
    title: "二寸",
    subtitle: "蓝底",
    widthMm: 35,
    heightMm: 49,
    dpi: 300,
    background: "blue",
    headRatio: 0.7,
  }),
  listed({
    id: "passport-cn",
    kind: ID_PHOTO_KIND,
    look: "id-card",
    enabled: true,
    title: "护照",
    subtitle: "白底",
    widthMm: 33,
    heightMm: 48,
    dpi: 300,
    background: "white",
    headRatio: 0.7,
  }),
  listed({
    id: "visa-us",
    kind: ID_PHOTO_KIND,
    look: "id-card",
    enabled: true,
    title: "美签",
    subtitle: "白底方寸",
    widthMm: 51,
    heightMm: 51,
    dpi: 300,
    background: "white",
    headRatio: 0.65,
  }),
  listed({
    id: "cn-1in-blue",
    kind: ID_PHOTO_KIND,
    look: "id-card",
    enabled: false,
    title: "一寸",
    subtitle: "蓝底",
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    background: "blue",
    headRatio: 0.7,
  }),
];

export function isGarmentSku(sku: KuanlanSku): sku is GarmentSku {
  return sku.kind === GARMENT_KIND;
}

export function isIdPhotoSku(sku: KuanlanSku): sku is IdPhotoSku {
  return sku.kind === ID_PHOTO_KIND;
}

export function skuPixelSize(sku: Pick<IdPhotoSku, "widthMm" | "heightMm" | "dpi">): {
  width: number;
  height: number;
} {
  return {
    width: Math.round((sku.widthMm / 25.4) * sku.dpi),
    height: Math.round((sku.heightMm / 25.4) * sku.dpi),
  };
}

export function listPublicSkus(): KuanlanSku[] {
  return SKUS.filter((sku) => sku.enabled).map(sealSkuBrand);
}

export function listGarmentSkus(): GarmentSku[] {
  return listPublicSkus().filter(isGarmentSku);
}

export function listIdPhotoSkus(): IdPhotoSku[] {
  return listPublicSkus().filter(isIdPhotoSku);
}

export function getEnabledSku(id: string): IdPhotoSku {
  const sku = SKUS.find((item) => item.id === id);
  if (!sku || !sku.enabled || !isIdPhotoSku(sku)) {
    throw new SkuUnavailableError(id);
  }
  return sealSkuBrand(sku);
}

export function getEnabledGarment(id: string): GarmentSku {
  const sku = SKUS.find((item) => item.id === id);
  if (!sku || !sku.enabled || !isGarmentSku(sku)) {
    throw new SkuUnavailableError(id);
  }
  return sealSkuBrand(sku);
}

export function toPublicSku(sku: GarmentSku): ReturnType<typeof toPublicGarment>;
export function toPublicSku(sku: IdPhotoSku): ReturnType<typeof toPublicIdPhoto>;
export function toPublicSku(sku: KuanlanSku) {
  return isGarmentSku(sku) ? toPublicGarment(sku) : toPublicIdPhoto(sku);
}

export function garmentSpecLines(spec: GarmentSpec): { identity: string; measures: string } {
  return {
    identity: [spec.size, spec.color, spec.material].filter(Boolean).join(" · "),
    measures: (Object.entries(GARMENT_MEASURE_LABELS) as [GarmentMeasureKey, string][])
      .filter(([key]) => spec.measures[key] != null)
      .map(([key, label]) => `${label} ${spec.measures[key]}`)
      .join(" · "),
  };
}

export function toPublicGarment(sku: GarmentSku) {
  const sealed = sealSkuBrand(sku);
  const spec = garmentSpecLines(sealed.spec);
  return {
    id: sealed.id,
    kind: sealed.kind,
    origin: sealed.origin,
    brand: sealed.brand,
    title: sealed.title,
    line: sealed.line,
    door: sealed.door,
    slots: sealed.slots,
    spec: sealed.spec,
    specIdentity: spec.identity,
    specMeasures: spec.measures,
    sample: wardrobeSampleSrc(sealed.id),
    widthPx: GARMENT_STILL.width,
    heightPx: GARMENT_STILL.height,
    href: `/create?piece=${sealed.id}`,
  };
}

export function toPublicIdPhoto(sku: IdPhotoSku) {
  const sealed = sealSkuBrand(sku);
  const pixels = skuPixelSize(sealed);
  return {
    id: sealed.id,
    kind: sealed.kind,
    origin: sealed.origin,
    brand: sealed.brand,
    title: sealed.title,
    subtitle: sealed.subtitle,
    widthMm: sealed.widthMm,
    heightMm: sealed.heightMm,
    dpi: sealed.dpi,
    look: sealed.look,
    background: sealed.background,
    garmentId: sealed.garmentId,
    widthPx: pixels.width,
    heightPx: pixels.height,
    sample: skuSampleSrc(sealed.id),
  };
}

export function listIdPhotoCreateTiles() {
  return listIdPhotoSkus().map((sku) => {
    const pub = toPublicIdPhoto(sku);
    return {
      ...pub,
      href: `/create/id-photo?sku=${sku.id}`,
    };
  });
}

export function idPhotoParentTile() {
  const live = listIdPhotoSkus();
  const sku = live.find((item) => item.id === ID_PHOTO_PARENT_SKU_ID) ?? live[0];
  if (!sku) {
    throw new SkuUnavailableError(ID_PHOTO_PARENT_SKU_ID);
  }
  const pub = toPublicIdPhoto(sku);
  return {
    ...pub,
    href: "/create/id-photo",
    title: "领证照",
    subtitle: "西装 / 针织 / 衬衫，证件照也在",
  };
}
