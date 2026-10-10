import {
  BETS,
  type BetId,
  HORIZONS,
  LANDED,
  LAYERS,
  type LandedId,
  type LayerId,
} from "@/nebutra/data/roadmap";

/**
 * The roadmap data arranged the way the page reads it: one timeline, oldest
 * first — each month that landed, then Now and Later — and, per layer, the
 * entries on that timeline that answer to it.
 */

export type Status = "done" | "active" | "exploring";

export type Entry =
  | { kind: "landed"; id: LandedId; serves: LayerId; prs: readonly number[]; status: Status }
  | { kind: "bet"; id: BetId; serves: LayerId; href?: string; status: Status };

export type Phase =
  | { kind: "month"; key: string; month: string; status: Status; entries: Entry[] }
  | {
      kind: "horizon";
      key: string;
      horizon: (typeof HORIZONS)[number];
      status: Status;
      entries: Entry[];
    };

const HORIZON_STATUS = { now: "active", later: "exploring" } as const;

export function timeline(): Phase[] {
  const months = [...new Set(LANDED.map((l) => l.month))].sort();
  const landed: Phase[] = months.map((month) => ({
    kind: "month",
    key: `m-${month}`,
    month,
    status: "done",
    entries: LANDED.filter((l) => l.month === month).map((l) => ({
      kind: "landed" as const,
      id: l.id,
      serves: l.serves,
      prs: l.prs,
      status: "done" as const,
    })),
  }));
  const ahead: Phase[] = HORIZONS.map((horizon) => ({
    kind: "horizon",
    key: horizon,
    horizon,
    status: HORIZON_STATUS[horizon],
    entries: BETS.filter((b) => b.horizon === horizon).map((b) => ({
      kind: "bet" as const,
      id: b.id,
      serves: b.serves,
      href: "href" in b ? b.href : undefined,
      status: HORIZON_STATUS[horizon],
    })),
  }));
  return [...landed, ...ahead];
}

/** DOM id of an entry on the timeline; the layer stack links to it. */
export const entryAnchor = (e: Entry) => `tl-${e.id}`;

export const layerNo = (id: LayerId) => id.slice(1);

export const layerName = (id: LayerId, zh: boolean) => {
  const name = LAYERS.find((l) => l.id === id)?.name;
  return zh ? (name?.zh ?? "") : (name?.en ?? "");
};
