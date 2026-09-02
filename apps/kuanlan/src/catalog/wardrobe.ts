import { GARMENT_STILL, listGarmentSkus, toPublicGarment } from "./skus";

export const WARDROBE_STILL = GARMENT_STILL;

export function listWardrobePieces() {
  return listGarmentSkus().map((sku) => {
    const pub = toPublicGarment(sku);
    return {
      ...pub,
      skuId: sku.id,
    };
  });
}
