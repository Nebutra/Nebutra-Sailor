import {
  ID_PHOTO_SIZES,
  type IdPhotoSizeId,
  listGarmentSkus,
  listIdPhotoSkus,
  parseIdPhotoRef,
} from "@/catalog/skus";

export const SHOOT_PATH = "/create/id-photo";

export type ShootPhase =
  | "empty"
  | "ready"
  | "shooting"
  | "kept"
  | "needs-sign-in"
  | "store-down"
  | "unreadable"
  | "sku-closed"
  | "failed";

export type ShootRef = {
  skuId: string;
  sizeId: string;
};

export type Shoot = ShootRef & {
  phase: ShootPhase;
  sourceUrl?: string;
  resultUrl?: string;
  resultId?: string;
  note?: string;
};

export type CreateView = "all" | "garment" | "id-photo";

export type CreateQuery = {
  view?: CreateView;
  q?: string;
  piece?: string;
  sizeId?: string;
};

export type ShootEvent =
  | { type: "spec"; skuId: string; sizeId: string }
  | { type: "source"; preview: string }
  | { type: "clear-source" }
  | { type: "shoot" }
  | { type: "kept"; url: string; id?: string }
  | { type: "http"; status: number }
  | { type: "failed" }
  | { type: "again" };

export function defaultShootRef(): ShootRef {
  const sku = listIdPhotoSkus()[0];
  if (!sku) {
    return { skuId: "", sizeId: "" };
  }
  return { skuId: sku.id, sizeId: sku.defaultSize };
}

export function parseShootSearch(input: { sku?: string; size?: string }): ShootRef {
  const fallback = defaultShootRef();
  const parsed = parseIdPhotoRef(input.sku, input.size);
  const sku =
    listIdPhotoSkus().find((item) => item.id === parsed.skuId) ??
    listIdPhotoSkus().find((item) => item.id === fallback.skuId);
  if (!sku) {
    return fallback;
  }
  const sizeId =
    parsed.sizeId && sku.sizes.includes(parsed.sizeId) ? parsed.sizeId : sku.defaultSize;
  return { skuId: sku.id, sizeId };
}

export function shootHref(ref: ShootRef, extra: { q?: string } = {}): string {
  const params = new URLSearchParams({ sku: ref.skuId, size: ref.sizeId });
  if (extra.q?.trim()) params.set("q", extra.q.trim());
  return `${SHOOT_PATH}?${params}`;
}

export function momentShootHref(moment: { skuId?: string; sizeId?: string }): string {
  return shootHref(parseShootSearch({ sku: moment.skuId, size: moment.sizeId }));
}

export function shootForGarment(garmentId: string): ShootRef | null {
  const sku = listIdPhotoSkus().find((item) => item.garmentId === garmentId);
  if (!sku) return null;
  return { skuId: sku.id, sizeId: sku.defaultSize };
}

export function createFilterHref(input: CreateQuery): string {
  const params = new URLSearchParams();
  if (input.view && (input.view !== "all" || input.q?.trim() || input.piece)) {
    params.set("view", input.view);
  }
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.piece) params.set("piece", input.piece);
  const query = params.toString();
  return query ? `/create?${query}` : "/create";
}

export function isCreateView(value?: string): value is CreateView {
  return value === "all" || value === "garment" || value === "id-photo";
}

export function parseCreateView(value?: string): CreateView {
  return value === "garment" || value === "id-photo" ? value : "all";
}

export function resolveCreateQuery(q: string): CreateQuery {
  const query = q.trim();
  if (!query) return {};

  for (const sku of listIdPhotoSkus()) {
    if (query.includes(sku.subtitle) || query === sku.title) {
      return { view: "id-photo", q: query };
    }
  }

  const garment = listGarmentSkus().find((item) => query.includes(item.title));
  if (garment) {
    return { view: "garment", piece: garment.id, q: query };
  }

  const size = (Object.values(ID_PHOTO_SIZES) as { id: IdPhotoSizeId; label: string }[]).find(
    (item) => query.includes(item.label),
  );
  if (size) {
    return { view: "id-photo", sizeId: size.id, q: query };
  }

  if (/证照|领英|职业/.test(query)) {
    return { view: "id-photo", q: query };
  }

  return { q: query };
}

export function openShoot(ref: ShootRef): Shoot {
  return { ...ref, phase: "empty" };
}

export function reduceShoot(state: Shoot, event: ShootEvent): Shoot {
  switch (event.type) {
    case "spec":
      return {
        ...state,
        skuId: event.skuId,
        sizeId: event.sizeId,
        resultUrl: undefined,
        resultId: undefined,
        phase: state.sourceUrl ? "ready" : "empty",
        note: undefined,
      };
    case "source":
      return {
        ...state,
        sourceUrl: event.preview,
        resultUrl: undefined,
        resultId: undefined,
        phase: "ready",
        note: undefined,
      };
    case "clear-source":
      return {
        ...state,
        sourceUrl: undefined,
        resultUrl: undefined,
        resultId: undefined,
        phase: "empty",
        note: undefined,
      };
    case "shoot":
      return { ...state, phase: "shooting", note: undefined };
    case "kept":
      return {
        ...state,
        phase: "kept",
        resultUrl: event.url,
        resultId: event.id,
        note: "这一组，拍好了。",
      };
    case "http":
      if (event.status === 401) {
        return { ...state, phase: "needs-sign-in", note: "先让观澜认识你。" };
      }
      if (event.status === 404) {
        return { ...state, phase: "sku-closed", note: "这一规格暂时不开放。" };
      }
      if (event.status === 503) {
        return { ...state, phase: "store-down", note: "这一刻还存不进去。" };
      }
      if (event.status === 400 || event.status === 413) {
        return { ...state, phase: "unreadable", note: "这张照片观澜看不清。" };
      }
      return { ...state, phase: "failed", note: "这一刻没留下。再试一次。" };
    case "failed":
      return { ...state, phase: "failed", note: "这一刻没留下。再试一次。" };
    case "again":
      return {
        ...state,
        resultUrl: undefined,
        resultId: undefined,
        phase: state.sourceUrl ? "ready" : "empty",
        note: undefined,
      };
  }
}

export function shootNote(phase: ShootPhase, empty = false): string {
  if (empty && phase === "failed") return "先选一张本人照片。";
  switch (phase) {
    case "needs-sign-in":
      return "先让观澜认识你。";
    case "sku-closed":
      return "这一规格暂时不开放。";
    case "store-down":
      return "这一刻还存不进去。";
    case "unreadable":
      return "这张照片观澜看不清。";
    case "kept":
      return "这一组，拍好了。";
    case "failed":
      return "这一刻没留下。再试一次。";
    default:
      return "";
  }
}
