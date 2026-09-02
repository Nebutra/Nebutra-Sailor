import {
  getSignedDownloadUrl,
  list,
  type UploadOptions,
  type UploadResult,
  upload,
} from "@nebutra/storage";
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

export async function listIdPhotoMoments(
  userId: string,
  io: {
    list?: (prefix: string, bucket?: "uploads") => Promise<string[]>;
    sign?: (key: string) => Promise<string>;
  } = {},
): Promise<Array<{ id: string; key: string; url: string }>> {
  requireR2();

  const prefix = momentUserPrefix(userId);
  const keys = await (io.list ?? list)(prefix, "uploads");
  const sign = io.sign ?? ((key: string) => getSignedDownloadUrl(key, { bucket: "uploads" }));

  return Promise.all(
    keys
      .filter((key) => key.endsWith(".png"))
      .map(async (key) => ({
        id: key.slice(prefix.length).replace(/\.png$/, ""),
        key,
        url: await sign(key),
      })),
  );
}

const RESOURCE_APP = "kuanlan";
