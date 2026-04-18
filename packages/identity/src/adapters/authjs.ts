import { type CanonicalIdentity, CanonicalIdentitySchema } from "@nebutra/contracts";
import { z } from "zod";

import type { IdentityAdapter } from "../types";

const AuthJsSessionSchema = z.object({
  user: z
    .object({
      id: z.string().min(1).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  token: z
    .object({
      sub: z.string().min(1).optional(),
      orgId: z.string().min(1).optional(),
      orgRole: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).optional(),
      sid: z.string().min(1).optional(),
      plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
    })
    .optional(),
});

export class AuthJsIdentityAdapter implements IdentityAdapter<unknown> {
  provider = "authjs" as const;

  mapToCanonical(input: unknown): CanonicalIdentity | null {
    const parsed = AuthJsSessionSchema.safeParse(input);
    if (!parsed.success) {
      return null;
    }

    const userId = parsed.data.user?.id ?? parsed.data.token?.sub;
    if (!userId) {
      return null;
    }

    const candidate = {
      provider: "authjs" as const,
      userId,
      organizationId: parsed.data.token?.orgId,
      role: parsed.data.token?.orgRole,
      plan: parsed.data.token?.plan,
      email: parsed.data.user?.email,
      sessionId: parsed.data.token?.sid,
      claimsVersion: "v1" as const,
    };

    const canonical = CanonicalIdentitySchema.safeParse(candidate);
    return canonical.success ? canonical.data : null;
  }
}
