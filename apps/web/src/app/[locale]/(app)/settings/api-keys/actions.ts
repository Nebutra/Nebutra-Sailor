"use server";

import { createHash, randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { prisma as db } from "@nebutra/db";
import { z } from "zod";
import { hasPermission, resolveRole } from "@/lib/permissions";

export type CreateKeyState =
  | { status: "idle" }
  | { status: "success"; key: string; keyId: string }
  | { status: "error"; message: string };

export type RevokeKeyState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const createSchema = z.object({
  name: z.string().min(1).max(64),
  orgId: z.string().min(1),
});

const revokeSchema = z.object({
  keyId: z.string().min(1),
  orgId: z.string().min(1),
});

/** Generate a secure API key with a readable prefix: nbtr_live_<random> */
function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = randomBytes(32).toString("base64url");
  const raw = `nbtr_live_${secret}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 16); // shown in UI for identification
  return { raw, hash, prefix };
}

export async function createApiKey(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const { orgId: sessionOrgId, sessionClaims } = await auth();
  if (!sessionOrgId) return { status: "error", message: "Not authenticated." };

  const role = resolveRole(sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "api_key:create")) {
    return { status: "error", message: "Insufficient permissions." };
  }

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    orgId: formData.get("orgId"),
  });
  if (!parsed.success) return { status: "error", message: "Invalid input." };

  const { name, orgId } = parsed.data;
  if (orgId !== sessionOrgId) return { status: "error", message: "Organization mismatch." };

  const { raw, hash, prefix } = generateApiKey();

  try {
    const record = await db.aPIKey.create({
      data: {
        name,
        keyHash: hash,
        keyPrefix: prefix,
        organizationId: orgId,
      },
      select: { id: true },
    });

    // Return the raw key ONCE — it is never stored plaintext
    return { status: "success", key: raw, keyId: record.id };
  } catch {
    return { status: "error", message: "Failed to create API key." };
  }
}

export async function revokeApiKey(
  _prev: RevokeKeyState,
  formData: FormData,
): Promise<RevokeKeyState> {
  const { orgId: sessionOrgId, sessionClaims } = await auth();
  if (!sessionOrgId) return { status: "error", message: "Not authenticated." };

  const role = resolveRole(sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "api_key:delete")) {
    return { status: "error", message: "Insufficient permissions." };
  }

  const parsed = revokeSchema.safeParse({
    keyId: formData.get("keyId"),
    orgId: formData.get("orgId"),
  });
  if (!parsed.success) return { status: "error", message: "Invalid input." };

  const { keyId, orgId } = parsed.data;
  if (orgId !== sessionOrgId) return { status: "error", message: "Organization mismatch." };

  try {
    await db.aPIKey.updateMany({
      where: { id: keyId, organizationId: orgId },
      data: { revokedAt: new Date() },
    });
    return { status: "success" };
  } catch {
    return { status: "error", message: "Failed to revoke key." };
  }
}
