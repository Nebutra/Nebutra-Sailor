import { useOrganization } from "@nebutra/auth/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { resolveApiUrl } from "@/lib/api/browser-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * Plans and organization credit packs are bought for the active workspace. A
 * fresh sign-in has none selected yet, so a buyer who belongs to exactly one
 * workspace — every new scaffold's demo account — acts in it, the same switch
 * the workspace menu makes. With several, nothing is chosen for them.
 *
 * Returns true while that switch is still being worked out.
 */
export function useSingleWorkspaceDefault(): boolean {
  const { organization, isLoaded, setActive } = useOrganization();
  const needsWorkspace = isLoaded && !organization;

  const workspaces = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: async (): Promise<Array<{ id: string }>> => {
      const response = await fetch(resolveApiUrl("/api/auth/organization/list"), {
        credentials: "include",
        headers: { accept: "application/json" },
      });
      return response.ok ? ((await response.json()) as Array<{ id: string }>) : [];
    },
    enabled: needsWorkspace,
  });

  const only = workspaces.data?.length === 1 ? workspaces.data[0]?.id : undefined;
  // One attempt: if the session still reports no workspace afterwards, the
  // page renders with what the gateway says rather than waiting forever.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!needsWorkspace || !only || settled) return;
    void setActive(only).finally(() => setSettled(true));
  }, [needsWorkspace, only, settled, setActive]);

  if (!isLoaded) return true;
  if (!needsWorkspace || settled) return false;
  return workspaces.isPending || only !== undefined;
}
