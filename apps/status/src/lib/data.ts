/**
 * Read-only data access for the public pages. Server only.
 *
 * A status page's traffic peaks exactly when the system it watches is
 * failing, so a snapshot is built at most once per slug every few seconds and
 * concurrent requests share the one in flight. The cache lives in the process
 * — a self-hosted instance is one process.
 */
import { getDb } from "@/server/db";
import { maintenancePhase } from "@/server/incidents";
import { buildPageSnapshot, type PageSnapshot, type SnapshotIncident } from "@/server/snapshot";

const TTL_MS = 15_000;
const cache = new Map<string, { at: number; value: Promise<PageSnapshot | null> }>();

export function databaseConfigured(): boolean {
  return Boolean(process.env.STATUS_DATABASE_URL);
}

export async function getSnapshot(slug: string): Promise<PageSnapshot | null> {
  const hit = cache.get(slug);
  const now = Date.now();
  if (hit && now - hit.at < TTL_MS) return hit.value;
  const value = buildPageSnapshot(getDb(), { slug });
  cache.set(slug, { at: now, value });
  value.catch(() => cache.delete(slug));
  return value;
}

/** Drop a page's cached snapshot so a change shows on the next view. */
export function invalidateSnapshot(slug: string): void {
  cache.delete(slug);
}

let localesCache: { at: number; value: Promise<string[]> } | null = null;

/**
 * The languages of the page `/` shows, for the root layout's `<html lang>`.
 * Cached like snapshots; an instance without a database answers both.
 */
export function defaultPageLocales(): Promise<string[]> {
  const now = Date.now();
  if (localesCache && now - localesCache.at < TTL_MS) return localesCache.value;
  const value = (async () => {
    if (!databaseConfigured()) return ["zh-CN", "en"];
    try {
      const target = await homeTarget();
      if (target.kind !== "page") return ["zh-CN", "en"];
      const page = await getDb().page.findUnique({
        where: { slug: target.slug },
        select: { locales: true },
      });
      return page?.locales ?? ["zh-CN", "en"];
    } catch {
      return ["zh-CN", "en"];
    }
  })();
  localesCache = { at: now, value };
  return value;
}

export type HomeTarget =
  | { kind: "page"; slug: string }
  | { kind: "choose"; pages: Array<{ slug: string; title: string }> }
  | { kind: "empty" }
  | { kind: "unconfigured" };

/** What `/` shows: STATUS_DEFAULT_PAGE, else the only page, else a choice or setup note. */
export async function homeTarget(): Promise<HomeTarget> {
  if (!databaseConfigured()) return { kind: "unconfigured" };
  const preferred = process.env.STATUS_DEFAULT_PAGE?.trim();
  if (preferred) return { kind: "page", slug: preferred };
  const pages = await getDb().page.findMany({
    select: { slug: true, title: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  if (pages.length === 0) return { kind: "empty" };
  if (pages.length === 1) return { kind: "page", slug: (pages[0] as { slug: string }).slug };
  return { kind: "choose", pages };
}

/**
 * One incident by id. The snapshot carries only the last 90 days; an older
 * incident link still has to open, so this reads it directly.
 */
export async function getIncident(
  pageId: string,
  id: string,
  now: Date = new Date(),
): Promise<SnapshotIncident | null> {
  const i = await getDb().incident.findFirst({
    where: { id, pageId },
    include: {
      updates: { orderBy: { createdAt: "asc" } },
      components: { include: { component: { select: { key: true, isPublic: true } } } },
    },
  });
  if (!i) return null;
  return {
    id: i.id,
    kind: i.kind,
    title: i.title,
    impact: i.impact,
    status: i.status,
    phase: i.kind === "maintenance" ? maintenancePhase(i, now) : null,
    scheduledStart: i.scheduledStart,
    scheduledEnd: i.scheduledEnd,
    resolvedAt: i.resolvedAt,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    componentKeys: i.components.filter((c) => c.component.isPublic).map((c) => c.component.key),
    updates: i.updates.map((u) => ({
      status: u.status,
      message: u.message,
      messageI18n: (u.messageI18n as Record<string, string> | null) ?? null,
      createdAt: u.createdAt,
    })),
  };
}
