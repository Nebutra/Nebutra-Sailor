"use client";

import { useOrganization } from "@nebutra/auth/client";
import { Button } from "@nebutra/ui/components";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export function SelectOrgClient({ initialJourneyParams }: SelectOrgClientProps) {
  const router = useRouter();
  const { organization, setActive } = useOrganization();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const copy = resolveSelectOrgJourneyCopy(initialJourneyParams);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch("/api/organizations");
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data.organizations || []);
        }
      } finally {
        setLoading(false);
      }
    }

    if (organization) {
      router.push("/");
    } else {
      void fetchOrganizations();
    }
  }, [organization, router]);

  async function handleSelectOrganization(orgId: string) {
    try {
      await setActive(orgId);
      router.push("/");
    } catch {
      // Keep the user on the selector so they can retry another workspace.
    }
  }

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
              <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-2" />
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center">
            <h2 className="text-base font-semibold text-neutral-12 dark:text-white">
              {copy.emptyTitle}
            </h2>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">{copy.emptyDescription}</p>
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
                className="flex w-full items-center gap-3 rounded-lg border border-neutral-7 bg-neutral-1 p-3 text-left transition-colors hover:bg-neutral-2 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
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
                  <p className="truncate font-medium text-neutral-12 dark:text-white">{org.name}</p>
                  <p className="truncate text-xs text-neutral-10 dark:text-white/60">{org.slug}</p>
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
