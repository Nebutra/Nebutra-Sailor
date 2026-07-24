/**
 * QR tools — qrcode (generate) + jsqr (decode).
 */
import jsQR from "jsqr";
import QRCode from "qrcode";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

export const qrGenerateTool = tool({
  id: "image/qr-generate",
  slug: "qr-generate",
  category: "image",
  title: { zh: "二维码生成", en: "QR Code Generator" },
  description: { zh: "qrcode 生成 PNG/SVG 二维码", en: "Generate QR codes as PNG or SVG" },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.image.qr_generate",
  engine: { name: "qrcode", upstream: "https://github.com/soldair/node-qrcode", version: "1.x" },
  seoKeywords: { zh: "二维码生成,qrcode在线生成", en: "qr code generator online" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string().min(1).max(4000),
    format: z.enum(["png", "svg", "dataurl"]).default("png"),
    width: z.number().int().min(64).max(1024).default(256),
    errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).default("M"),
    margin: z.number().int().min(0).max(8).default(2),
  }),
  execute: async (input: {
    text: string;
    format?: "png" | "svg" | "dataurl";
    width?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
  }) => {
    const format = input.format ?? "png";
    const opts = {
      errorCorrectionLevel: input.errorCorrectionLevel ?? "M",
      margin: input.margin ?? 2,
      width: input.width ?? 256,
    } as const;
    if (format === "svg") {
      const svg = await QRCode.toString(input.text, { ...opts, type: "svg" });
      return {
        format: "svg" as const,
        contentType: "image/svg+xml",
        data: svg,
        engine: "qrcode",
      };
    }
    if (format === "dataurl") {
      const dataUrl = await QRCode.toDataURL(input.text, opts);
      return {
        format: "dataurl" as const,
        contentType: "image/png",
        data: dataUrl,
        engine: "qrcode",
      };
    }
    const buf = await QRCode.toBuffer(input.text, { ...opts, type: "png" });
    return {
      format: "png" as const,
      contentType: "image/png",
      base64: buf.toString("base64"),
      bytes: buf.length,
      engine: "qrcode",
    };
  },
});

export const qrDecodeTool = tool({
  id: "image/qr-decode",
  slug: "qr-decode",
  category: "image",
  title: { zh: "二维码解析", en: "QR Code Decoder" },
  description: { zh: "jsQR 从图片解析二维码内容", en: "Decode QR codes from images via jsQR" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.image.qr_decode",
  engine: { name: "jsqr", upstream: "https://github.com/cozmo/jsQR", version: "1.x" },
  seoKeywords: { zh: "二维码解析,扫码识别在线", en: "qr code decoder online" },
  sotaStatus: "production",
  inputSchema: z.object({
    imageBase64: z.string().min(1),
  }),
  execute: async (input: { imageBase64: string }) => {
    const cleaned = input.imageBase64.includes(",")
      ? (input.imageBase64.split(",").pop() ?? input.imageBase64)
      : input.imageBase64;
    const buf = Buffer.from(cleaned, "base64");

    // Decode via sharp → raw RGBA for jsQR when sharp available
    try {
      const sharpMod = await import("sharp");
      const sharp = sharpMod.default ?? sharpMod;
      const { data, info } = await sharp(buf)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      if (!code) throw new Error("No QR code found in image");
      return {
        text: code.data,
        version: code.version,
        location: code.location,
        engine: "jsqr+sharp",
      };
    } catch (err) {
      if (err instanceof Error && err.message === "No QR code found in image") throw err;
      throw new Error(
        `QR decode requires sharp for raster decode: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
});

export const qrTools: readonly AnyForgeToolDefinition[] = [qrGenerateTool, qrDecodeTool];
