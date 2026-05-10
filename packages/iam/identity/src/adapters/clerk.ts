import { type CanonicalIdentity, CanonicalIdentitySchema } from "@nebutra/contracts";
import { z } from "zod";

import type { IdentityAdapter } from "../types";

const ClerkPayloadSchema = z.object({
  sub: z.string().min(1),
  org_id: z.string().min(1).optional(),
  org_role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).optional(),
  sid: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export class ClerkIdentityAdapter implements IdentityAdapter<unknown> {
  provider = "clerk" as const;

  mapToCanonical(input: unknown): CanonicalIdentity | null {
    const parsed = ClerkPayloadSchema.safeParse(input);
    if (!parsed.success) {
      return null;
    }

    const candidate = {
      provider: "clerk" as const,
      userId: parsed.data.sub,
      organizationId: parsed.data.org_id,
      role: parsed.data.org_role,
      email: parsed.data.email,
      sessionId: parsed.data.sid,
      claimsVersion: "v1" as const,
    };

    const canonical = CanonicalIdentitySchema.safeParse(candidate);
    return canonical.success ? canonical.data : null;
  }
}
