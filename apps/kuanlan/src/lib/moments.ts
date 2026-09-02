import { describeIdPhotoRef } from "@/catalog/skus";

export type IdPhotoMoment = {
  id: string;
  key: string;
  url: string;
  /** From the object's last-modified time. Absent if the store did not report one. */
  shotAt?: Date;
  skuId?: string;
  sizeId?: string;
};

export type IdPhotoMomentPage = {
  moments: IdPhotoMoment[];
  /** Every Moment the user has, not just the ones on this page. */
  total: number;
  latestAt?: Date;
};

/**
 * Newest first.
 *
 * Moment ids are UUIDs, so the store's own key order is lexicographic and
 * therefore arbitrary — the grid used to come back in a different order than it
 * was shot in. Entries with no time sort last rather than to the top, and the id
 * breaks ties so the order does not wobble between renders.
 */
export function sortMomentsNewestFirst<T extends { id: string; shotAt?: Date }>(
  moments: readonly T[],
): T[] {
  return [...moments].sort((a, b) => {
    const at = a.shotAt?.getTime();
    const bt = b.shotAt?.getTime();
    if (at != null && bt != null && at !== bt) return bt - at;
    if (at == null && bt != null) return 1;
    if (at != null && bt == null) return -1;
    return a.id.localeCompare(b.id);
  });
}

/** What a shot is, for a caption: "领证照 · 灰蓝 · 西装 · 40 × 50". */
export function momentLabel(moment: Pick<IdPhotoMoment, "skuId" | "sizeId">): string {
  const described = describeIdPhotoRef(moment.skuId, moment.sizeId);
  if (!described) return "拍过的一张";
  return described.detail ? `${described.title} · ${described.detail}` : described.title;
}
