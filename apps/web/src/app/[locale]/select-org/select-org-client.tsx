"use client";

import { useOrganization } from "@nebutra/auth/client";
import { Button } from "@nebutra/ui/components";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { queryKeys } from "@/lib/query-keys";
import { resolveSelectOrgJourneyCopy, type SelectOrgSearchParams } from "./journey-state";

interface Organization {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

interface SelectOrgClientProps {
  initialJourneyParams: SelectOrgSearchParams;
}

async function fetchOrganizations(signal?: AbortSignal): Promise<Organization[]> {
  const response = await fetch("/api/organizations", { signal });
  if (!response.ok) {
    throw new Error(`Failed to load workspaces (${response.status})`);
  }
  const data = (await response.json()) as { organizations?: Organization[] };
  return data.organizations ?? [];
}

export function SelectOrgClient({ initialJourneyParams }: SelectOrgClientProps) {
  const router = useRouter();
  const { organization, setActive } = useOrganization();
  const tSelectOrg = useTranslations("selectOrg");
  const copy = resolveSelectOrgJourneyCopy(initialJourneyParams);
  const emptyTitle = tSelectOrg(`${copy.variant}.emptyTitle`);
  const emptyDescription = tSelectOrg(`${copy.variant}.emptyDescription`);

  // Redirect is a navigation side effect, not server cache — keep it in an
  // effect. When an organization is already active there is nothing to choose.
  useEffect(() => {
    if (organization) {
      router.push("/");
    }
  }, [organization, router]);

  // Only fetch when there is no active organization (mirrors the original
  // conditional fetch). useQuery's `signal` replaces the manual fetch lifecycle.
  const orgsQuery = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: ({ signal }) => fetchOrganizations(signal),
    enabled: !organization,
  });

  // Selecting a workspace is a navigation action (setActive + redirect), not a
  // query or mutation — it stays a plain handler.
  async function handleSelectOrganization(orgId: string) {
    try {
      await setActive(orgId);
      router.push("/");
    } catch {
      // Keep the user on the selector so they can retry another workspace.
    }
  }

  // Show the skeleton while the query is in flight, and also while an active
  // organization triggers the redirect above (matches the original behaviour
  // where `loading` started true and stayed true through the redirect).
  const loading = Boolean(organization) || orgsQuery.isPending;
  const organizations = orgsQuery.data ?? [];
  const error = orgsQuery.error
    ? orgsQuery.error instanceof Error
      ? orgsQuery.error.message
      : "Failed to load workspaces."
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-[var(--radius-lg)] bg-neutral-2" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="mb-4 rounded-[var(--radius-md)] border border-red-6 bg-red-2 px-3 py-2 text-sm text-red-11">
              {error}
            </p>
            <Link href={copy.emptyActionHref}>
              <Button className="w-full">{copy.emptyActionLabel}</Button>
            </Link>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center">
            <h2 className="text-base font-semibold text-neutral-12">{emptyTitle}</h2>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
            <Link href={copy.emptyActionHref}>
              <Button className="w-full">{copy.emptyActionLabel}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {organizations.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSelectOrganization(org.id)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] bg-neutral-2 p-3 text-left transition-colors hover:bg-neutral-3"
              >
                {org.image ? (
                  // biome-ignore lint/performance/noImgElement: Clerk organization avatars can be arbitrary remote URLs outside next/image remotePatterns.
                  <img src={org.image} alt={org.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-9 text-sm font-semibold text-white">
                    {org.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-12">{org.name}</p>
                  <p className="truncate text-xs text-neutral-10">{org.slug}</p>
                </div>
              </button>
            ))}
            <Link href="/onboarding">
              <Button variant="outlined" className="mt-4 w-full">
                {copy.createActionLabel}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
