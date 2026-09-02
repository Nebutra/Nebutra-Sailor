import {
  getSignedDownloadUrl,
  head,
  listDetailed,
  type ObjectEntry,
  type ObjectHead,
  type UploadOptions,
  type UploadResult,
  upload,
} from "@nebutra/storage";
import { type IdPhotoMoment, type IdPhotoMomentPage, sortMomentsNewestFirst } from "./moments";
import {
  isR2Configured,
  momentObjectKey,
  momentUserPrefix,
  ResourceStoreUnavailableError,
} from "./resources";

export type PutObject = (
  key: string,
  body: Buffer | Blob | ReadableStream,
  options?: UploadOptions,
) => Promise<UploadResult>;

const ALLOWED_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function requireR2(): void {
  if (!isR2Configured()) {
    throw new ResourceStoreUnavailableError();
  }
}

export function portraitContentType(type: string): string {
  return ALLOWED_SOURCE_TYPES.has(type) ? type : "application/octet-stream";
}

export async function persistIdPhotoMoment(
  input: {
    id?: string;
    userId: string;
    skuId: string;
    sizeId?: string;
    print: Buffer;
    source: Buffer;
    sourceType: string;
  },
  put: PutObject = upload,
): Promise<{ id: string; key: string; url: string; sourceKey: string }> {
  requireR2();

  const id = input.id ?? crypto.randomUUID();
  const key = momentObjectKey({ kind: "id-photo", userId: input.userId, id });
  const sourceKey = momentObjectKey({
    kind: "id-photo",
    userId: input.userId,
    id,
    part: "source",
  });
  const metadata = {
    skuId: input.skuId,
    ...(input.sizeId ? { sizeId: input.sizeId } : {}),
    app: RESOURCE_APP,
    userId: input.userId,
  };

  const stored = await put(key, input.print, {
    bucket: "uploads",
    contentType: "image/png",
    metadata,
  });
  await put(sourceKey, input.source, {
    bucket: "uploads",
    contentType: portraitContentType(input.sourceType),
    metadata,
  });

  return {
    id,
    key: stored.key,
    url: stored.url,
    sourceKey,
  };
}

/**
 * Object metadata comes back with lower-cased keys.
 *
 * S3 metadata names are case-insensitive and the SDK normalises them on read, so
 * the `skuId` written at upload is `skuid` coming out. Reading only the camelCase
 * form silently yields undefined and every Moment loses its caption.
 */
function metaValue(metadata: Record<string, string> | undefined, name: string): string | undefined {
  if (!metadata) return undefined;
  return metadata[name] ?? metadata[name.toLowerCase()];
}

/**
 * A user's Moments, newest first.
 *
 * `limit` bounds the head requests, not the count: ordering and `total` come out
 * of the single listing for free, and only the entries actually rendered pay a
 * HeadObject to read back their SKU. Pass it wherever the surface shows a
 * preview rather than the whole grid.
 */
export async function listIdPhotoMoments(
  userId: string,
  io: {
    list?: (prefix: string, bucket?: "uploads") => Promise<ObjectEntry[]>;
    sign?: (key: string) => Promise<string>;
    head?: (key: string) => Promise<ObjectHead | null>;
  } = {},
  options: { limit?: number } = {},
): Promise<IdPhotoMomentPage> {
  requireR2();

  const prefix = momentUserPrefix(userId);
  const entries = await (io.list ?? listDetailed)(prefix, "uploads");
  const sign = io.sign ?? ((key: string) => getSignedDownloadUrl(key, { bucket: "uploads" }));
  const readHead = io.head ?? ((key: string) => head(key, "uploads"));

  const ordered = sortMomentsNewestFirst(
    entries
      .filter((entry) => entry.key.endsWith(".png"))
      .map((entry) => ({
        id: entry.key.slice(prefix.length).replace(/\.png$/, ""),
        key: entry.key,
        ...(entry.lastModified ? { shotAt: entry.lastModified } : {}),
      })),
  );

  const page = options.limit != null ? ordered.slice(0, options.limit) : ordered;
  const moments: IdPhotoMoment[] = await Promise.all(
    page.map(async (moment) => {
      const [url, meta] = await Promise.all([sign(moment.key), readHead(moment.key)]);
      const skuId = metaValue(meta?.metadata, "skuId");
      const sizeId = metaValue(meta?.metadata, "sizeId");
      return {
        ...moment,
        url,
        ...(skuId ? { skuId } : {}),
        ...(sizeId ? { sizeId } : {}),
      };
    }),
  );

  return {
    moments,
    total: ordered.length,
    ...(ordered[0]?.shotAt ? { latestAt: ordered[0].shotAt } : {}),
  };
}

const RESOURCE_APP = "kuanlan";
