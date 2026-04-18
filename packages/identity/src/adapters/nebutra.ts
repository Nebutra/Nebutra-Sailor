/**
 * Nebutra Identity Adapter
 *
 * Maps oidc-provider / Nebutra-issued OIDC tokens to CanonicalIdentity.
 * Used when Nebutra acts as both the IdP AND the resource server —
 * i.e., when a Nebutra service receives an access token issued by
 * the Nebutra IdP and needs to resolve the user identity.
 */

import type { CanonicalIdentity } from "@nebutra/contracts";
import type { IdentityAdapter } from "../types";

interface NebutraOIDCClaims {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  "nebutra:organization_id"?: string;
  "nebutra:role"?: string;
  "nebutra:plan"?: string;
  [key: string]: unknown;
}

export class NebutraIdentityAdapter implements IdentityAdapter<NebutraOIDCClaims> {
  readonly provider = "nebutra" as const;

  mapToCanonical(input: NebutraOIDCClaims): CanonicalIdentity | null {
    if (!input.sub) return null;

    return {
      provider: "nebutra",
      userId: input.sub,
      organizationId: input["nebutra:organization_id"],
      role: this.mapRole(input["nebutra:role"]),
      plan: this.mapPlan(input["nebutra:plan"]),
      email: input.email,
      claimsVersion: "v1",
    };
  }

  private mapRole(role?: string): "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | undefined {
    const validRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
    if (role && validRoles.includes(role as (typeof validRoles)[number])) {
      return role as (typeof validRoles)[number];
    }
    return undefined;
  }

  private mapPlan(plan?: string): "FREE" | "PRO" | "ENTERPRISE" | undefined {
    const validPlans = ["FREE", "PRO", "ENTERPRISE"] as const;
    if (plan && validPlans.includes(plan as (typeof validPlans)[number])) {
      return plan as (typeof validPlans)[number];
    }
    return undefined;
  }
}
