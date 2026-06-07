/**
 * GET /api/v1/feature-flags
 *
 * Returns the feature flags enabled for the current tenant/user.
 * Used by the client-side FeatureFlagProvider to hydrate the React context.
 *
 * Evaluated server-side so sensitive flag logic (plan checks, A/B buckets)
 * never leaks to the client.
 */

import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { type NextRequest, NextResponse } from "next/server";
import { getAuth, getTenantContext } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const { tenantId, plan } = await getTenantContext();
  const { userId } = await getAuth();

  const flagEntries = await Promise.all(
    Object.entries(FLAGS).map(async ([key, flag]) => {
      const enabled = await isFeatureEnabled(flag, {
        userId: userId ?? undefined,
        tenantId: tenantId ?? undefined,
        plan: (plan?.toLowerCase() || "free") as "free" | "pro" | "enterprise",
      });
      return [key, enabled] as const;
    }),
  );

  return NextResponse.json(
    { flags: Object.fromEntries(flagEntries) },
    {
      headers: {
        // Cache for 60s in browser, 30s shared cache — flags change rarely
        "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
      },
    },
  );
}
