import type { IdPhotoSku } from "@/catalog/skus";

export const DEFAULT_IMAGE2_BASE_URL = "https://api.302.ai/v1";
export const DEFAULT_IMAGE2_MODEL = "gpt-image-2";

const BACKGROUND_COPY = {
  white: "纯白背景",
  blue: "标准证件照蓝底",
  red: "标准证件照红底",
} as const;

export class Image2UnavailableError extends Error {
  constructor(message = "image2_unconfigured") {
    super(message);
    this.name = "Image2UnavailableError";
  }
}

export function image2ApiKey(): string {
  return process.env.IMAGE2_API_KEY || process.env.SENSENOVA_API_KEY || "";
}

export function image2BaseUrl(): string {
  return (
    process.env.IMAGE2_BASE_URL ||
    process.env.SENSENOVA_BASE_URL ||
    DEFAULT_IMAGE2_BASE_URL
  ).replace(/\/$/, "");
}

export function image2Model(): string {
  return process.env.IMAGE2_MODEL || DEFAULT_IMAGE2_MODEL;
}

export function isImage2Configured(): boolean {
  return Boolean(image2ApiKey());
}

export function image2SizeForSku(sku: Pick<IdPhotoSku, "widthMm" | "heightMm">): string {
  if (sku.widthMm === sku.heightMm) {
    return "1024x1024";
  }
  return sku.heightMm > sku.widthMm ? "1024x1536" : "1536x1024";
}

export function idPhotoShootBrief(sku: IdPhotoSku): string {
  return [
    "Official identification portrait of the same person in the reference photo.",
    "Front-facing head and shoulders, even studio lighting, both ears visible, natural expression.",
    `Plain ${BACKGROUND_COPY[sku.background]}, no props, no watermark, no text.`,
    "Keep identity, face shape, skin, hair, and glasses unchanged. Do not beautify.",
  ].join(" ");
}

export function extractImage2Bytes(payload: unknown): Buffer {
  const data = (payload as { data?: Array<{ b64_json?: string; url?: string }> })?.data;
  const first = data?.[0];
  if (first?.b64_json) {
    return Buffer.from(first.b64_json, "base64");
  }
  throw new Image2UnavailableError("image2_empty");
}

export function requireImage2(): void {
  if (!isImage2Configured()) {
    throw new Image2UnavailableError();
  }
}

export async function shootWithImage2(input: {
  image: Buffer;
  prompt: string;
  size: string;
  mimeType?: string;
}): Promise<Buffer> {
  requireImage2();

  const body = new FormData();
  body.set("model", image2Model());
  body.set("prompt", input.prompt);
  body.set("size", input.size);
  body.set(
    "image",
    new Blob([new Uint8Array(input.image)], { type: input.mimeType || "image/png" }),
    "portrait.png",
  );

  const response = await fetch(`${image2BaseUrl()}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${image2ApiKey()}`,
    },
    body,
    signal: AbortSignal.timeout(120_000),
  });

  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Image2UnavailableError(payload?.error?.message || `image2_http_${response.status}`);
  }

  if (payload?.data?.[0]?.b64_json) {
    return extractImage2Bytes(payload);
  }

  const remote = payload?.data?.[0]?.url;
  if (!remote) {
    throw new Image2UnavailableError("image2_empty");
  }

  const downloaded = await fetch(remote, { signal: AbortSignal.timeout(30_000) });
  if (!downloaded.ok) {
    throw new Image2UnavailableError("image2_download");
  }
  return Buffer.from(await downloaded.arrayBuffer());
}
