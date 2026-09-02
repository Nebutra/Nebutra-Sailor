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
export type IdPhotoBackground = "white" | "blue" | "red" | "smoke" | "light" | "studio";
export type IdPhotoSizeId = "linkedin" | "1in" | "2in" | "passport" | "visa";

export type IdPhotoSize = {
  id: IdPhotoSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  headRatio: number;
};

export const ID_PHOTO_SIZES: Record<IdPhotoSizeId, IdPhotoSize> = {
  linkedin: {
    id: "linkedin",
    label: "40 × 50",
    widthMm: 40,
    heightMm: 50,
    dpi: 300,
    headRatio: 0.72,
  },
  "1in": { id: "1in", label: "一寸", widthMm: 25, heightMm: 35, dpi: 300, headRatio: 0.7 },
  "2in": { id: "2in", label: "二寸", widthMm: 35, heightMm: 49, dpi: 300, headRatio: 0.7 },
  passport: {
    id: "passport",
    label: "护照",
    widthMm: 33,
    heightMm: 48,
    dpi: 300,
    headRatio: 0.7,
  },
  visa: { id: "visa", label: "美签", widthMm: 51, heightMm: 51, dpi: 300, headRatio: 0.65 },
};

const LINKEDIN_SIZES = ["linkedin", "1in", "2in", "passport", "visa"] as const;
const ID_CARD_WHITE_SIZES = ["1in", "2in", "passport", "visa"] as const;

export const ID_PHOTO_PRINT_ALIASES: Record<string, { skuId: string; sizeId: IdPhotoSizeId }> = {
  "cn-1in-white": { skuId: "id-white", sizeId: "1in" },
  "cn-2in-white": { skuId: "id-white", sizeId: "2in" },
  "passport-cn": { skuId: "id-white", sizeId: "passport" },
  "visa-us": { skuId: "id-white", sizeId: "visa" },
  "cn-2in-blue": { skuId: "id-blue", sizeId: "2in" },
  "cn-1in-blue": { skuId: "id-blue", sizeId: "1in" },
};

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
  background: IdPhotoBackground;
  garmentId?: GarmentId;
  sizes: readonly IdPhotoSizeId[];
  defaultSize: IdPhotoSizeId;
  closedSizes?: readonly IdPhotoSizeId[];
  headRatio?: number;
};

export type IdPhotoPrint = Omit<
  IdPhotoSku,
  "sizes" | "defaultSize" | "closedSizes" | "headRatio"
> & {
  sizeId: IdPhotoSizeId;
  sizeLabel: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
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
    background: "smoke",
    garmentId: "blazer",
    sizes: LINKEDIN_SIZES,
    defaultSize: "linkedin",
    headRatio: 0.72,
  }),
  listed({
    id: "linkedin-smoke-knit",
    kind: ID_PHOTO_KIND,
    look: "linkedin",
    enabled: true,
    title: "领证照",
    subtitle: "灰蓝 · 针织",
    background: "smoke",
    garmentId: "knit",
    sizes: LINKEDIN_SIZES,
    defaultSize: "linkedin",
    headRatio: 0.72,
  }),
  listed({
    id: "linkedin-smoke-oxford",
    kind: ID_PHOTO_KIND,
    look: "linkedin",
    enabled: true,
    title: "领证照",
    subtitle: "灰蓝 · 衬衫",
    background: "smoke",
    garmentId: "oxford",
    sizes: LINKEDIN_SIZES,
    defaultSize: "linkedin",
    headRatio: 0.72,
  }),
  listed({
    id: "linkedin-light",
    kind: ID_PHOTO_KIND,
    look: "linkedin",
    enabled: true,
    title: "领证照",
    subtitle: "浅灰 · 西装",
    background: "light",
    garmentId: "blazer",
    sizes: LINKEDIN_SIZES,
    defaultSize: "linkedin",
    headRatio: 0.72,
  }),
  listed({
    id: "linkedin-studio",
    kind: ID_PHOTO_KIND,
    look: "linkedin",
    enabled: true,
    title: "领证照",
    subtitle: "质感蓝 · 西装",
    background: "studio",
    garmentId: "blazer",
    sizes: LINKEDIN_SIZES,
    defaultSize: "linkedin",
    headRatio: 0.62,
  }),
  listed({
    id: "id-white",
    kind: ID_PHOTO_KIND,
    look: "id-card",
    enabled: true,
    title: "证件照",
    subtitle: "白底",
    background: "white",
    sizes: ID_CARD_WHITE_SIZES,
    defaultSize: "1in",
  }),
  listed({
    id: "id-blue",
    kind: ID_PHOTO_KIND,
    look: "id-card",
    enabled: true,
    title: "证件照",
    subtitle: "蓝底",
    background: "blue",
    sizes: ["2in"],
    defaultSize: "2in",
    closedSizes: ["1in"],
  }),
];

export function isGarmentSku(sku: KuanlanSku): sku is GarmentSku {
  return sku.kind === GARMENT_KIND;
}

export function isIdPhotoSku(sku: KuanlanSku): sku is IdPhotoSku {
  return sku.kind === ID_PHOTO_KIND;
}

export function skuPixelSize(sku: Pick<IdPhotoPrint, "widthMm" | "heightMm" | "dpi">): {
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

export function parseIdPhotoRef(
  skuId?: string,
  sizeId?: string,
): { skuId: string; sizeId?: IdPhotoSizeId } {
  const alias = skuId ? ID_PHOTO_PRINT_ALIASES[skuId] : undefined;
  const resolvedSku = alias?.skuId ?? skuId ?? "";
  const requested = sizeId ?? alias?.sizeId;
  if (requested && requested in ID_PHOTO_SIZES) {
    return { skuId: resolvedSku, sizeId: requested as IdPhotoSizeId };
  }
  return { skuId: resolvedSku };
}

function findIdPhotoSku(id: string): IdPhotoSku | undefined {
  const sku = SKUS.find((item) => item.id === id);
  return sku && isIdPhotoSku(sku) ? sku : undefined;
}

function isLiveSize(sku: IdPhotoSku, sizeId: IdPhotoSizeId): boolean {
  return sku.sizes.includes(sizeId);
}

export function getEnabledSku(id: string): IdPhotoSku {
  const ref = parseIdPhotoRef(id);
  const sku = findIdPhotoSku(ref.skuId);
  if (!sku || !sku.enabled) {
    throw new SkuUnavailableError(id);
  }
  if (ref.sizeId && !isLiveSize(sku, ref.sizeId)) {
    throw new SkuUnavailableError(id);
  }
  return sealSkuBrand(sku);
}

export function resolveIdPhotoPrint(skuOrId: string | IdPhotoSku, sizeId?: string): IdPhotoPrint {
  const sku = typeof skuOrId === "string" ? getEnabledSku(skuOrId) : sealSkuBrand(skuOrId);
  const ref = parseIdPhotoRef(typeof skuOrId === "string" ? skuOrId : sku.id, sizeId);
  const resolvedSize = ref.sizeId ?? sku.defaultSize;
  if (!isLiveSize(sku, resolvedSize)) {
    throw new SkuUnavailableError(`${sku.id}:${resolvedSize}`);
  }
  const size = ID_PHOTO_SIZES[resolvedSize];
  const {
    sizes: _sizes,
    defaultSize: _defaultSize,
    closedSizes: _closed,
    headRatio,
    ...rest
  } = sku;
  return {
    ...rest,
    sizeId: size.id,
    sizeLabel: size.label,
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    dpi: size.dpi,
    headRatio:
      sku.look === "linkedin" && size.id === "linkedin"
        ? (headRatio ?? size.headRatio)
        : size.headRatio,
  };
}

export function listLiveIdPhotoSizes(sku: IdPhotoSku): IdPhotoSize[] {
  return sku.sizes.map((id) => ID_PHOTO_SIZES[id]);
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
export function toPublicSku(
  sku: KuanlanSku,
): ReturnType<typeof toPublicGarment> | ReturnType<typeof toPublicIdPhoto>;
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

export function toPublicIdPhoto(sku: IdPhotoSku, sizeId?: string) {
  const sealed = sealSkuBrand(sku);
  const print = resolveIdPhotoPrint(sealed, sizeId);
  const pixels = skuPixelSize(print);
  const sizes = listLiveIdPhotoSizes(sealed).map((size) => {
    const sizePixels = skuPixelSize(size);
    return {
      id: size.id,
      label: size.label,
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      dpi: size.dpi,
      widthPx: sizePixels.width,
      heightPx: sizePixels.height,
    };
  });
  return {
    id: sealed.id,
    kind: sealed.kind,
    origin: sealed.origin,
    brand: sealed.brand,
    title: sealed.title,
    subtitle: sealed.subtitle,
    sizeId: print.sizeId,
    sizeLabel: print.sizeLabel,
    sizes,
    widthMm: print.widthMm,
    heightMm: print.heightMm,
    dpi: print.dpi,
    look: sealed.look,
    background: sealed.background,
    garmentId: sealed.garmentId,
    widthPx: pixels.width,
    heightPx: pixels.height,
    sample: skuSampleSrc(sealed.id),
  };
}

export function listIdPhotoCreateTiles(options?: { excludeParent?: boolean }) {
  return listIdPhotoSkus()
    .filter((sku) => !options?.excludeParent || sku.id !== ID_PHOTO_PARENT_SKU_ID)
    .map((sku) => {
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
