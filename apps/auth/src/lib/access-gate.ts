import { createAccessGate, createPrismaAccessInviteStore } from "@nebutra/access-gate";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { isAccessGateEnabled } from "./access-gate-mode";

export { isAccessGateEnabled };

export interface AccessGateSignupContext {
  email: string;
  plaintextCode: string;
  tenantId?: string;
}

export function isEmailSignUpRequest(request: Request): boolean {
  const url = new URL(request.url);
  return request.method.toUpperCase() === "POST" && url.pathname.endsWith("/sign-up/email");
}

export function isOAuthRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.includes("/oauth/") || url.pathname.includes("/one-tap/");
}

export function createAccessGateService() {
  return createAccessGate({
    store: createPrismaAccessInviteStore(
      getSystemDb() as unknown as Parameters<typeof createPrismaAccessInviteStore>[0],
    ),
    issuerQuota: 1,
  });
}

export async function readAccessGateSignupContext(
  request: Request,
): Promise<AccessGateSignupContext | Response | null> {
  if (!isAccessGateEnabled() || !isEmailSignUpRequest(request)) return null;

  const payload = (await request
    .clone()
    .json()
    .catch(() => null)) as {
    email?: unknown;
    accessInviteCode?: unknown;
    inviteCode?: unknown;
    tenantId?: unknown;
  } | null;
  const email = typeof payload?.email === "string" ? payload.email : "";
  const plaintextCode =
    typeof payload?.accessInviteCode === "string"
      ? payload.accessInviteCode
      : typeof payload?.inviteCode === "string"
        ? payload.inviteCode
        : "";

  if (!email.trim() || !plaintextCode.trim()) {
    return Response.json(
      { code: "ACCESS_INVITE_REQUIRED", error: "A valid invite code is required to sign up." },
      { status: 400 },
    );
  }

  const tenantId = typeof payload?.tenantId === "string" ? payload.tenantId.trim() : "";

  return { email, plaintextCode, ...(tenantId ? { tenantId } : {}) };
}

export async function enforceAccessGatePreflight(
  context: AccessGateSignupContext | null,
): Promise<Response | null> {
  if (!context) return null;

  try {
    await createAccessGateService().validate({
      plaintextCode: context.plaintextCode,
      email: context.email,
      ...(context.tenantId ? { tenantId: context.tenantId } : {}),
    });
    return null;
  } catch (error) {
    logger.warn("[auth] access-gate signup preflight rejected", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      {
        code: "INVALID_ACCESS_INVITE",
        error: "Invite code is invalid, expired, or not available.",
      },
      { status: 400 },
    );
  }
}

export function extractSignedUpUserId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id === "string") return record.id;
  if (record.user && typeof record.user === "object") {
    const user = record.user as Record<string, unknown>;
    if (typeof user.id === "string") return user.id;
  }
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (typeof data.id === "string") return data.id;
    if (data.user && typeof data.user === "object") {
      const user = data.user as Record<string, unknown>;
      if (typeof user.id === "string") return user.id;
    }
  }
  return null;
}

export async function redeemAccessInviteAfterSignup(
  context: AccessGateSignupContext | null,
  response: Response,
): Promise<Response | null> {
  if (!context || response.status < 200 || response.status >= 300) return null;

  const payload = await response
    .clone()
    .json()
    .catch(() => null);
  const userId = extractSignedUpUserId(payload);
  if (!userId) {
    logger.warn("[auth] access-gate signup succeeded but response had no user id");
    return Response.json(
      {
        code: "ACCESS_INVITE_REDEMPTION_FAILED",
        error: "Invite redemption failed. Contact support before retrying.",
      },
      { status: 500 },
    );
  }

  try {
    await createAccessGateService().redeem({
      plaintextCode: context.plaintextCode,
      redeemedByUserId: userId,
      email: context.email,
      ...(context.tenantId ? { tenantId: context.tenantId } : {}),
    });
    return null;
  } catch (error) {
    logger.error("[auth] access-gate post-signup redemption failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      {
        code: "ACCESS_INVITE_REDEMPTION_FAILED",
        error: "Invite redemption failed. Contact support before retrying.",
      },
      { status: 500 },
    );
  }
}

export function accessGateOauthDisabledResponse(): Response {
  return Response.json(
    {
      code: "ACCESS_GATE_OAUTH_DISABLED",
      error: "OAuth is disabled while invite-only access is enabled.",
    },
    { status: 403 },
  );
}
