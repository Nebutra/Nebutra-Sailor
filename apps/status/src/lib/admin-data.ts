/** Admin reads: incidents of a page in the shape the public pages already use. Server only. */
import { getDb } from "@/server/db";
import { type SnapshotIncident, toSnapshotIncident } from "@/server/snapshot";

const include = {
  updates: { orderBy: { createdAt: "asc" as const } },
  components: { include: { component: { select: { key: true } } } },
};

export async function pageIncidents(pageId: string, limit = 100): Promise<SnapshotIncident[]> {
  const now = new Date();
  const rows = await getDb().incident.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include,
  });
  return rows.map((r) => toSnapshotIncident(r, now));
}

export async function pageIncident(pageId: string, id: string): Promise<SnapshotIncident | null> {
  const row = await getDb().incident.findFirst({ where: { id, pageId }, include });
  return row ? toSnapshotIncident(row, new Date()) : null;
}

export async function pageComponents(pageId: string) {
  return getDb().component.findMany({
    where: { pageId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { group: { select: { key: true, name: true } }, evidence: true, monitors: true },
  });
}

/** Open first (incidents and unfinished maintenance), then everything closed. */
export function splitOpen(incidents: SnapshotIncident[]) {
  const isOpen = (i: SnapshotIncident) =>
    i.kind === "maintenance" ? i.phase !== "completed" : i.status !== "resolved";
  return { open: incidents.filter(isOpen), closed: incidents.filter((i) => !isOpen(i)) };
}
