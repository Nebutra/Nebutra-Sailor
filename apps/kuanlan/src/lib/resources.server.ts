import {
  getSignedDownloadUrl,
  head,
  listDetailed,
  type ObjectEntry,
  type ObjectHead,
  remove,
  type UploadOptions,
  type UploadResult,
  upload,
} from "@nebutra/storage";
import { type IdPhotoMoment, type IdPhotoMomentPage, sortMomentsNewestFirst } from "./moments";
import {
  InvalidResourceKeyError,
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

export function requireR2(): void {
  if (!isR2Configured()) {
    throw new ResourceStoreUnavailableError();
  }
}

function unavailableFrom(error: unknown): never {
  if (error instanceof ResourceStoreUnavailableError || error instanceof InvalidResourceKeyError) {
    throw error;
  }
  throw new ResourceStoreUnavailableError(
    error instanceof Error ? error.message : "r2_unavailable",
  );
}

/**
 * Keep the print. Do not keep the portrait it was made from.
 *
 * This used to write the uploaded original alongside every Moment as
 * `{id}.source`, and nothing ever read it back — not a route, not a script, not
 * the studio. A face photograph kept forever with no reader is liability with
 * no product behind it, so the write is gone rather than given a retention
 * policy. `momentObjectKey`'s `source` part stays, because deletion still has
 * to reach the objects written before this.
 *
 * If re-shooting from an original ever becomes a real feature, it arrives with
 * its own consent and a stated retention period, not as a side effect of
 * shooting once.
 */
export async function persistIdPhotoMoment(
  input: {
    id?: string;
    userId: string;
    skuId: string;
    sizeId?: string;
    print: Buffer;
  },
  put: PutObject = upload,
): Promise<{ id: string; key: string; url: string }> {
  requireR2();

  try {
    const id = input.id ?? crypto.randomUUID();
    const key = momentObjectKey({ kind: "id-photo", userId: input.userId, id });

    const stored = await put(key, input.print, {
      bucket: "uploads",
      contentType: "image/png",
      metadata: {
        skuId: input.skuId,
        ...(input.sizeId ? { sizeId: input.sizeId } : {}),
        app: RESOURCE_APP,
        userId: input.userId,
      },
    });

    return { id, key: stored.key, url: stored.url };
  } catch (error) {
    unavailableFrom(error);
  }
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
/**
 * Remove a Moment: the print, and the original written before that write was
 * dropped.
 *
 * Both keys go through `momentObjectKey`, which pins them under the caller's own
 * prefix and rejects anything that is not a plain moment id — a caller cannot
 * reach another person's shelf. `DeleteObject` is indifferent to a missing key,
 * so a Moment stored after the source write was dropped deletes just as cleanly
 * as one stored before it.
 */
export async function deleteIdPhotoMoment(
  userId: string,
  id: string,
  io: { remove?: (key: string, bucket?: "uploads") => Promise<void> } = {},
): Promise<void> {
  requireR2();

  const drop = io.remove ?? remove;
  const print = momentObjectKey({ kind: "id-photo", userId, id });
  const legacySource = momentObjectKey({ kind: "id-photo", userId, id, part: "source" });

  try {
    await Promise.all([drop(print, "uploads"), drop(legacySource, "uploads")]);
  } catch (error) {
    unavailableFrom(error);
  }
}

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

  try {
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
  } catch (error) {
    unavailableFrom(error);
  }
}

const RESOURCE_APP = "kuanlan";
