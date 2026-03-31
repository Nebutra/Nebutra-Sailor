"use client";

import { useOrganization } from "@nebutra/auth/client";
import { Button } from "@nebutra/ui/components";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

export default function SelectOrgPage() {
  const router = useRouter();
  const { organization, setActive } = useOrganization();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      router.push("/");
    } else {
      fetchOrganizations();
    }
  }, [organization, router]);

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

  async function handleSelectOrganization(orgId: string) {
    try {
      await setActive(orgId);
      router.push("/");
    } catch {
      // Handle error
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Select a workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a workspace to continue, or create a new one.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-neutral-2 animate-pulse" />
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No workspaces yet. Create one to get started.
            </p>
            <Link href="/onboarding">
              <Button className="w-full">Create workspace</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelectOrganization(org.id)}
                className="w-full flex items-center gap-3 rounded-lg border border-neutral-7 bg-neutral-1 p-3 text-left transition-colors hover:bg-neutral-2 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                {org.image ? (
                  <img src={org.image} alt={org.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded bg-blue-9 flex items-center justify-center text-white text-sm font-semibold">
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
              <Button variant="outlined" className="w-full mt-4">
                Create new workspace
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
