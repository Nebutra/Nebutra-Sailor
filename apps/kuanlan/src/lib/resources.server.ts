import {
  getSignedDownloadUrl,
  remove,
  type UploadOptions,
  type UploadResult,
  upload,
} from "@nebutra/storage";
import { tenantDbFor } from "./db";
import type { IdPhotoMoment, IdPhotoMomentPage } from "./moments";
import {
  InvalidResourceKeyError,
  isR2Configured,
  momentObjectKey,
  ResourceStoreUnavailableError,
} from "./resources";
import { listShoots, type ShootStore } from "./shoots";

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

/**
 * A person's Moments, newest first — read from `Task` rows, not the bucket.
 *
 * The bucket is now an artifact store. It used to be the truth, which meant a
 * listing could not tell a finished shoot from a failed one, came back in key
 * order (UUIDs, so arbitrary), and needed one HeadObject per Moment just to
 * learn its SKU. All of that is a column now: `payload` carries the SKU and
 * size, `createdAt` carries the order, and `status` carries the difference
 * between done and not. The only R2 call left is signing the URL, which is a
 * local computation.
 *
 * `limit` bounds the page; `total` counts every finished shoot.
 */
export async function listIdPhotoMoments(
  userId: string,
  io: {
    db?: ShootStore;
    tenantId?: string;
    sign?: (key: string) => Promise<string>;
  } = {},
  options: { limit?: number } = {},
): Promise<IdPhotoMomentPage> {
  requireR2();

  const scoped =
    io.db && io.tenantId ? { db: io.db, tenantId: io.tenantId } : await scopedFor(userId);
  const sign = io.sign ?? ((key: string) => getSignedDownloadUrl(key, { bucket: "uploads" }));

  const { rows, total } = await listShoots(scoped.db, scoped.tenantId, options);

  const moments: IdPhotoMoment[] = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      key: row.result?.key ?? "",
      url: row.result?.key ? await sign(row.result.key) : "",
      shotAt: row.completedAt ?? row.createdAt,
      skuId: row.payload.skuId,
      sizeId: row.payload.sizeId,
    })),
  );

  return {
    moments,
    total,
    ...(rows[0] ? { latestAt: rows[0].completedAt ?? rows[0].createdAt } : {}),
  };
}

async function scopedFor(userId: string): Promise<{ db: ShootStore; tenantId: string }> {
  const { db, tenant } = await tenantDbFor({ userId });
  return { db, tenantId: tenant.tenantId };
}

const RESOURCE_APP = "kuanlan";
