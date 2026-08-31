import { type UploadOptions, type UploadResult, upload } from "@nebutra/storage";
import { isR2Configured, momentObjectKey, ResourceStoreUnavailableError } from "./resources";

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
    skuId: string;
    print: Buffer;
    source: Buffer;
    sourceType: string;
  },
  put: PutObject = upload,
): Promise<{ id: string; key: string; url: string; sourceKey: string }> {
  requireR2();

  const id = input.id ?? crypto.randomUUID();
  const key = momentObjectKey({ kind: "id-photo", id });
  const sourceKey = momentObjectKey({ kind: "id-photo", id, part: "source" });

  const stored = await put(key, input.print, {
    bucket: "uploads",
    contentType: "image/png",
    metadata: { skuId: input.skuId, app: RESOURCE_APP },
  });
  await put(sourceKey, input.source, {
    bucket: "uploads",
    contentType: portraitContentType(input.sourceType),
    metadata: { skuId: input.skuId, app: RESOURCE_APP },
  });

  return {
    id,
    key: stored.key,
    url: stored.url,
    sourceKey,
  };
}

const RESOURCE_APP = "kuanlan";
