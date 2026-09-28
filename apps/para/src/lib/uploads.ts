"use client";

import type { Asset } from "@/domain/types";
import { api, rememberAsset } from "@/mock/queries";
import { GATEWAY_URL, GatewayError, isGatewayMode } from "./gateway-api";

/**
 * 上传: a local file becomes an account asset the canvas can place.
 *
 * Gateway mode uses the direct-to-storage flow the gateway already serves
 * (backends/gateway/src/routes/uploads): `POST /api/v1/uploads/presign` returns a presigned PUT,
 * the browser sends the bytes straight to object storage, `POST /api/v1/uploads/complete` confirms
 * it, and the object's public URL is recorded as a PARA asset. The upload envelope carries the
 * object key but not a readable URL, so the public base comes from NEXT_PUBLIC_PARA_UPLOAD_PUBLIC_URL
 * (the same value the origin reads as UPLOAD_PUBLIC_BASE_URL). Without it an upload could be stored
 * but never shown, so 上传 is not offered.
 *
 * Mock mode keeps the file in the tab as an object URL.
 */

const PUBLIC_BASE = process.env.NEXT_PUBLIC_PARA_UPLOAD_PUBLIC_URL ?? "";

export const canUpload = !isGatewayMode || PUBLIC_BASE.length > 0;

/** What the file picker accepts: the media a node can hold. */
export const UPLOAD_ACCEPT = "image/*,video/*";

interface PresignEnvelope {
  id: string;
  key: string;
  presigned_upload: { url: string; method: "PUT" | "POST"; headers: Record<string, string> } | null;
}

async function uploadsCall<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/uploads${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error ?? `${res.status} ${res.statusText}`;
    throw new GatewayError(res.status, message, json);
  }
  return json as T;
}

async function storeInGateway(file: File): Promise<string> {
  const presign = await uploadsCall<PresignEnvelope>("/presign", {
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size: file.size,
    metadata: { product: "para" },
  });
  const target = presign.presigned_upload;
  if (!target) throw new Error("上传地址无效");
  const put = await fetch(target.url, {
    method: target.method,
    headers: target.headers,
    body: file,
  });
  if (!put.ok) throw new Error(`上传失败（${put.status}）`);
  await uploadsCall("/complete", { upload_id: presign.id, size: file.size });
  return `${PUBLIC_BASE.replace(/\/$/, "")}/${presign.key}`;
}

const ASPECTS: ReadonlyArray<[Asset["aspect"], number]> = [
  ["16:9", 16 / 9],
  ["4:3", 4 / 3],
  ["1:1", 1],
  ["3:4", 3 / 4],
  ["9:16", 9 / 16],
];

/** The asset aspect closest to a width × height. */
export function nearestAspect(width: number, height: number): Asset["aspect"] {
  if (!width || !height) return "16:9";
  const r = width / height;
  let best = ASPECTS[0] as [Asset["aspect"], number];
  for (const a of ASPECTS)
    if (Math.abs(Math.log(a[1] / r)) < Math.abs(Math.log(best[1] / r))) best = a;
  return best[0];
}

/** An image's shape, read before upload so the node frames it uncropped. Video defaults to 16:9. */
async function measure(file: File): Promise<Asset["aspect"]> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return "16:9";
  try {
    const bitmap = await createImageBitmap(file);
    const aspect = nearestAspect(bitmap.width, bitmap.height);
    bitmap.close();
    return aspect;
  } catch {
    return "16:9";
  }
}

export function mediaTypeOf(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

/** Store `file` and record it as an upload asset. Rejects files a node cannot hold. */
export async function uploadAsset(
  file: File,
  where: { projectId?: string | null; workspaceId?: string | null } = {},
): Promise<Asset> {
  const type = mediaTypeOf(file);
  if (!type) throw new Error("只支持图片和视频");
  const aspect = await measure(file);
  const url = isGatewayMode ? await storeInGateway(file) : URL.createObjectURL(file);
  const asset = await api.createAsset({
    type,
    url,
    label: file.name,
    aspect,
    origin: "upload",
    ...(where.projectId ? { projectId: where.projectId } : {}),
    ...(where.workspaceId ? { workspaceId: where.workspaceId } : {}),
  });
  rememberAsset(asset);
  return asset;
}
