import { env } from "../../config/env.js";

export type AiOriginHeaderInput = {
  tenantId: string;
  requestId?: string | null | undefined;
  clientIp?: string | null | undefined;
};

export function resolveAiOriginClientIp(headers: Headers): string | undefined {
  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || undefined;
}

export function buildAiOriginHeaders(input: AiOriginHeaderInput): Record<string, string> {
  const { tenantId, requestId, clientIp } = input;

  return {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenantId,
    "x-nebutra-tenant-id": tenantId,
    ...(requestId ? { "x-nebutra-request-id": requestId, "x-request-id": requestId } : {}),
    ...(clientIp ? { "x-nebutra-client-ip": clientIp } : {}),
    ...(env.GATEWAY_SHARED_SECRET ? { "x-nebutra-gateway-secret": env.GATEWAY_SHARED_SECRET } : {}),
  };
}
