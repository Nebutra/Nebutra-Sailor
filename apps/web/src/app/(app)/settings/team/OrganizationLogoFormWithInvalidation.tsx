"use client";

import { useQueryClient } from "@tanstack/react-query";
import { OrganizationLogoForm } from "@/components/organizations/organization-logo-form";
import { queryKeys } from "@/lib/query-keys";

interface Props {
  orgId: string;
  orgName: string;
  initialLogoUrl: string | null;
}

/**
 * Thin client boundary that wraps OrganizationLogoForm to wire reactive
 * React Query cache invalidation on logo update.
 *
 * Decision 5 (2026-06-06): invalidate queryKeys.organizations.logo(orgId) on
 * every successful upload or delete so the sidebar BrandLogo reflects the
 * new logo without a page reload. This is the hard-but-right approach per the
 * Phase 6 plan spec.
 */
export function OrganizationLogoFormWithInvalidation({ orgId, orgName, initialLogoUrl }: Props) {
  const queryClient = useQueryClient();

  function handleUpdated(_next: { logoUrl: string | null }) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.organizations.logo(orgId),
    });
  }

  return (
    <OrganizationLogoForm
      orgId={orgId}
      orgName={orgName}
      initialLogoUrl={initialLogoUrl}
      onUpdated={handleUpdated}
    />
  );
}
