import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { GarmentId, IdPhotoSku } from "@/catalog/skus";

export const DEFAULT_IMAGE2_BASE_URL = `${getBrandOrigin("router")}/v1`;
export const DEFAULT_IMAGE2_MODEL = "gpt-image-2";

const BACKGROUND_COPY = {
  white: "纯白背景",
  blue: "标准证件照蓝底",
  red: "标准证件照红底",
  smoke: "灰蓝烟雾底",
  light: "浅灰职业照背景",
  studio: "质感蓝棚底",
} as const;

const ATTIRE_COPY = {
  blazer: "tailored navy blazer over a crisp white open-collar dress shirt, no tie",
  knit: "fine-knit charcoal merino crewneck with a white shirt collar just visible at the neck",
  oxford: "navy oxford button-down shirt, top button undone, no jacket",
} as const;

export function garmentStillBrief(garment: GarmentId, options?: { reference?: boolean }): string {
  return [
    options?.reference
      ? "Ghost-mannequin product photograph of the same garment in the reference photo."
      : "Ghost-mannequin product photograph of one garment only.",
    "No person, no mannequin stand, no hanger, no face, no hands.",
    "Front view, waist-up, centered. Even studio lighting.",
    "The garment holds a hollow worn shape.",
    "Seamless mid-grey cyclorama #7e8691.",
    "One in-camera exposure. Empty, no props, no watermark, no text.",
    "Do not cut out, mask, replace, or composite the background. no halo.",
    `Attire: ${ATTIRE_COPY[garment]}.`,
  ].join(" ");
}

function attireForSku(sku: Pick<IdPhotoSku, "background" | "garmentId">): string {
  const garment: GarmentId = sku.garmentId ?? "blazer";
  if (sku.background === "studio") {
    if (garment === "oxford") {
      return "business-casual white shirt, minimalist, paired with a simple dark tie, no jacket";
    }
    if (garment === "knit") {
      return ATTIRE_COPY.knit;
    }
    return "tailored navy blazer over a crisp white dress shirt, paired with a simple dark tie";
  }
  return ATTIRE_COPY[garment];
}

export class Image2UnavailableError extends Error {
  constructor(message = "image2_unconfigured") {
    super(message);
    this.name = "Image2UnavailableError";
  }
}

export function image2ApiKey(): string {
  return process.env.ROUTER_API_KEY || process.env.IMAGE2_API_KEY || "";
}

export function image2BaseUrl(): string {
  return (process.env.IMAGE2_BASE_URL || DEFAULT_IMAGE2_BASE_URL).replace(/\/$/, "");
}

export function image2Model(): string {
  return process.env.IMAGE2_MODEL || DEFAULT_IMAGE2_MODEL;
}

export function isImage2Configured(): boolean {
  return Boolean(image2ApiKey());
}

export function image2SizeForSku(
  sku: Pick<{ widthMm: number; heightMm: number }, "widthMm" | "heightMm">,
): string {
  if (sku.widthMm === sku.heightMm) {
    return "1024x1024";
  }
  return sku.heightMm > sku.widthMm ? "1024x1536" : "1536x1024";
}

/** Server-only SKU brief. Never send this string to the browser. */
export function idPhotoShootBrief(
  sku: Pick<IdPhotoSku, "look" | "background" | "garmentId">,
): string {
  if (sku.look === "linkedin") {
    const studio = sku.background === "studio";
    return [
      studio
        ? "American-style professional headshot of the same person in the reference photo."
        : "Professional LinkedIn headshot of the same person in the reference photo.",
      studio
        ? "Half-body portrait, camera at eye level. Leave space above the crown. Do not crop the top of the hair."
        : "Head-and-shoulders, camera at eye level, slight natural head tilt so it is not stiff.",
      studio
        ? "Soft natural studio lighting, realistic skin. Do not beautify."
        : "Soft even studio lighting, realistic skin. Do not beautify.",
      studio
        ? `She stands several feet in front of a painted textured ${BACKGROUND_COPY[sku.background]} muslin cyclorama in a real photography studio. Photograph one in-camera exposure. Fine hair overlaps the painted canvas. Soft contact shadow on the backdrop. Empty, no props, no watermark, no text. Do not cut out, mask, replace, or composite the background. no halo.`
        : `Seamless ${BACKGROUND_COPY[sku.background]}, empty, no props, no watermark, no text.`,
      `Attire: ${attireForSku(sku)}.`,
      studio
        ? "Expression relaxed and natural. Keep identity, face, hair, and glasses unchanged. Change clothes to the specified attire. Not a passport or official identification photo."
        : "Keep identity, face, hair, and glasses unchanged. Change clothes to the specified attire. Not a passport or official identification photo.",
    ].join(" ");
  }
  return [
    "Official identification portrait of the same person in the reference photo.",
    "Front-facing head and shoulders, even studio lighting, both ears visible, natural expression.",
    "Leave space above the crown. Do not crop the top of the hair.",
    `Plain ${BACKGROUND_COPY[sku.background]}, no props, no watermark, no text.`,
    "Keep identity, face shape, skin, hair, and glasses unchanged. Do not beautify.",
  ].join(" ");
}

/** Catalog still only. No reference photo — image2 must photograph the backdrop. */
export function idPhotoCatalogBrief(sku: IdPhotoSku): string {
  if (sku.look === "linkedin" && sku.background === "studio") {
    return [
      "American-style professional headshot of a young East Asian woman.",
      "Half-body portrait, camera at eye level. Leave space above the crown. Do not crop the top of the hair.",
      "Soft natural studio lighting, realistic skin. Do not beautify.",
      `She stands several feet in front of a darker painted textured ${BACKGROUND_COPY[sku.background]} muslin cyclorama in a real photography studio.`,
      "One in-camera exposure. Fine hair overlaps the painted canvas. Soft contact shadow on the backdrop.",
      "No rim light, no hair light, no backlight. Hair and backdrop share the same grain.",
      "Empty, no props, no watermark, no text. Do not cut out, mask, replace, or composite the background. no halo.",
      `Attire: ${attireForSku(sku)}.`,
      "Expression relaxed and natural. Not a passport or official identification photo.",
    ].join(" ");
  }
  return idPhotoShootBrief(sku);
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

type Image2Payload = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

async function readImage2Image(response: Response): Promise<Buffer> {
  const payload = (await response.json().catch(() => null)) as Image2Payload | null;

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

export async function generateWithImage2(input: { prompt: string; size: string }): Promise<Buffer> {
  requireImage2();

  const response = await fetch(`${image2BaseUrl()}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${image2ApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: image2Model(),
      prompt: input.prompt,
      size: input.size,
      n: 1,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  return readImage2Image(response);
}

export async function shootWithImage2(input: {
  image: Buffer;
  prompt: string;
  size: string;
  mimeType?: string;
}): Promise<Buffer> {
  requireImage2();

  // 302.ai / OpenAI images.edits contract — same fields, router host + key.
  const body = new FormData();
  body.set("model", image2Model());
  body.set("prompt", input.prompt);
  body.set("size", input.size);
  body.set("n", "1");
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

  return readImage2Image(response);
}
