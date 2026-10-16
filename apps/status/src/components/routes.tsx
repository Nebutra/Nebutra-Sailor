/**
 * The route bodies, shared so `/`, `/status` and `/p/[slug]` render the same
 * page without an HTTP hop: each reads the snapshot straight from the
 * instance's database.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSnapshot, homeTarget } from "@/lib/data";
import { requestLocale } from "@/lib/request-locale";
import type { PageSnapshot } from "@/server/snapshot";
import { HistoryView } from "./history-view";
import { PageShell } from "./page-shell";
import { StatusView } from "./status-view";

type Query = Record<string, string | string[] | undefined>;

export async function loadSnapshotOr404(slug: string): Promise<PageSnapshot> {
  const snapshot = await getSnapshot(slug);
  if (!snapshot) notFound();
  return snapshot;
}

export async function pageMetadata(
  snapshot: PageSnapshot | null,
  lang?: string | string[],
): Promise<Metadata> {
  if (!snapshot) return {};
  const locale = await requestLocale(lang, snapshot.page.locales);
  const t = await getTranslations({ locale, namespace: "meta" });
  const feed = `/api/v1/pages/${snapshot.page.slug}/feed`;
  return {
    title: t("statusOf", { title: snapshot.page.title }),
    description: snapshot.page.description ?? undefined,
    alternates: {
      types: {
        "application/atom+xml": `${feed}.atom`,
        "application/rss+xml": `${feed}.rss`,
      },
    },
  };
}

export async function StatusRoute({
  slug,
  query,
  path,
}: {
  slug: string;
  query: Query;
  path: string;
}) {
  const snapshot = await loadSnapshotOr404(slug);
  const locale = await requestLocale(query.lang, snapshot.page.locales);
  return (
    <PageShell locale={locale} page={snapshot.page} path={path}>
      <StatusView snapshot={snapshot} locale={locale} />
    </PageShell>
  );
}

export async function HistoryRoute({ slug, query }: { slug: string; query: Query }) {
  const snapshot = await loadSnapshotOr404(slug);
  const locale = await requestLocale(query.lang, snapshot.page.locales);
  return (
    <PageShell locale={locale} page={snapshot.page} path={`/p/${slug}/history`}>
      <HistoryView snapshot={snapshot} locale={locale} />
    </PageShell>
  );
}

/** `/` and `/status`: the default page, or a calm note on what to set up. */
export async function HomeRoute({ query, path }: { query: Query; path: string }) {
  const target = await homeTarget();
  if (target.kind === "page") return <StatusRoute slug={target.slug} query={query} path={path} />;
  const locale = await requestLocale(query.lang, ["zh-CN", "en"]);
  const t = await getTranslations({ locale, namespace: "home" });
  const title =
    target.kind === "unconfigured"
      ? t("unconfiguredTitle")
      : target.kind === "empty"
        ? t("emptyTitle")
        : t("chooseTitle");
  const body =
    target.kind === "unconfigured"
      ? t("unconfiguredBody")
      : target.kind === "empty"
        ? t("emptyBody")
        : t("chooseBody");
  return (
    <PageShell locale={locale} page={null} path={path}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">{body}</p>
      {target.kind === "choose" ? (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {target.pages.map((p) => (
            <li key={p.slug}>
              <a
                href={`/p/${p.slug}`}
                className="flex items-center justify-between gap-3 px-4 py-4 text-sm transition-colors hover:bg-muted/40 sm:px-5"
              >
                <span className="font-medium text-foreground">{p.title}</span>
                <span className="font-mono text-xs text-muted-foreground">/p/{p.slug}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </PageShell>
  );
}
