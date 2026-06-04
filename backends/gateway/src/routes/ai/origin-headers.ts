import { signServiceToken } from "@nebutra/auth";
import { env } from "../../config/env.js";

export type AiOriginHeaderInput = {
  tenantId: string;
  requestId?: string | null | undefined;
  clientIp?: string | null | undefined;
};

export type AuthenticatedAiOriginHeaderInput = AiOriginHeaderInput & {
  userId?: string | null | undefined;
  role?: string | null | undefined;
  plan?: string | null | undefined;
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

export async function buildAuthenticatedAiOriginHeaders(
  input: AuthenticatedAiOriginHeaderInput,
): Promise<Record<string, string>> {
  const { tenantId, userId, role, plan } = input;
  const token = await signServiceToken({
    organizationId: tenantId,
    ...(userId ? { userId } : {}),
    ...(role ? { role } : {}),
    ...(plan ? { plan } : {}),
  });

  return {
    ...buildAiOriginHeaders(input),
    "x-service-token": token,
    "x-organization-id": tenantId,
    ...(userId ? { "x-user-id": userId } : {}),
    ...(role ? { "x-role": role } : {}),
    ...(plan ? { "x-plan": plan } : {}),
  };
}
