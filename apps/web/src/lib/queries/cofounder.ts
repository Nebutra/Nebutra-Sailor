import { queryOptions } from "@tanstack/react-query";
import type { CofounderCardData } from "@/components/cofounder-match/cofounder-card";
import { queryKeys } from "@/lib/query-keys";

/** Client reads for the cofounder match surfaces (matches list, room). */

export interface MatchEntry extends CofounderCardData {
  readonly profileId: string;
}

export interface RoomAccess {
  readonly granted: boolean;
  readonly planName: string | null;
  readonly status: string;
}

/** A room the caller is not matched into reads as `null`, not as an error. */
export type RoomView = { match: MatchEntry; access: RoomAccess } | null;

export function cofounderMatchesQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.cofounder.matches(),
    queryFn: async ({ signal }): Promise<MatchEntry[]> => {
      const res = await fetch("/api/cofounder/matches", { credentials: "include", signal });
      if (!res.ok) throw new Error(`Failed to load matches (${res.status})`);
      const data = (await res.json()) as { matches?: MatchEntry[] };
      return data.matches ?? [];
    },
  });
}

export function cofounderRoomQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: queryKeys.cofounder.room(profileId),
    queryFn: async ({ signal }): Promise<RoomView> => {
      const res = await fetch(`/api/cofounder/room/${profileId}`, {
        credentials: "include",
        signal,
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Failed to load the room (${res.status})`);
      return (await res.json()) as { match: MatchEntry; access: RoomAccess };
    },
  });
}
