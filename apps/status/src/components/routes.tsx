/**
 * Route bodies shared by `/`, `/status` and `/p/[slug]`: each reads the
 * snapshot straight from the instance's database, no HTTP hop.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSnapshot, homeTarget } from "@/lib/data";
import { type AppLocale, normalizeLocale, pickI18n } from "@/lib/locale";
import { requestLocale, requestTimeZone } from "@/lib/request-locale";
import type { PageSnapshot } from "@/server/snapshot";
import { HistoryView } from "./history-view";
import { PageShell } from "./page-shell";
import { StatusView } from "./status-view";

export type Query = Record<string, string | string[] | undefined>;

/** Components a reader can narrow a subscription to, in their language. */
export function subscribableComponents(snapshot: PageSnapshot, locale: AppLocale) {
  return snapshot.components.map((c) => ({
    key: c.key,
    name: pickI18n(c.name, c.nameI18n, locale),
  }));
}

export async function loadSnapshotOr404(slug: string): Promise<PageSnapshot> {
  const snapshot = await getSnapshot(slug);
  if (!snapshot) notFound();
  return snapshot;
}

/**
 * A shared `?lang=` link becomes the reader's saved choice: hand it to the
 * language route, which sets the cookie and comes back to the clean path.
 * Every internal link after that keeps the language without carrying it.
 */
export function adoptLangParam(query: Query, path: string): void {
  const raw = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  const locale = normalizeLocale(raw);
  if (locale) redirect(`/lang/${locale}?next=${encodeURIComponent(path)}`);
}

export async function pageMetadata(snapshot: PageSnapshot | null): Promise<Metadata> {
  if (!snapshot) return {};
  const locale = await requestLocale(undefined, snapshot.page.locales);
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
  adoptLangParam(query, path);
  const snapshot = await loadSnapshotOr404(slug);
  const [locale, timeZone] = await Promise.all([
    requestLocale(undefined, snapshot.page.locales),
    requestTimeZone(),
  ]);
  return (
    <PageShell
      locale={locale}
      page={snapshot.page}
      path={path}
      components={subscribableComponents(snapshot, locale)}
    >
      <StatusView snapshot={snapshot} locale={locale} timeZone={timeZone} />
    </PageShell>
  );
}

export async function HistoryRoute({ slug, query }: { slug: string; query: Query }) {
  const path = `/p/${slug}/history`;
  adoptLangParam(query, path);
  const snapshot = await loadSnapshotOr404(slug);
  const [locale, timeZone] = await Promise.all([
    requestLocale(undefined, snapshot.page.locales),
    requestTimeZone(),
  ]);
  return (
    <PageShell
      locale={locale}
      page={snapshot.page}
      path={path}
      components={subscribableComponents(snapshot, locale)}
    >
      <HistoryView snapshot={snapshot} locale={locale} timeZone={timeZone} />
    </PageShell>
  );
}

/** `/` and `/status`: the default page, a list of pages, or a calm setup note. */
export async function HomeRoute({ query, path }: { query: Query; path: string }) {
  const target = await homeTarget();
  if (target.kind === "page") return <StatusRoute slug={target.slug} query={query} path={path} />;
  adoptLangParam(query, path);
  const locale = await requestLocale(undefined, ["zh-CN", "en"]);
  const t = await getTranslations({ locale, namespace: "home" });
  const key =
    target.kind === "unconfigured" ? "unconfigured" : target.kind === "empty" ? "empty" : "choose";
  return (
    <PageShell locale={locale} page={null} path={path}>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{t(`${key}Title`)}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`${key}Body`)}</p>
      {target.kind === "choose" ? <PageList pages={target.pages} /> : null}
    </PageShell>
  );
}

export function PageList({ pages }: { pages: Array<{ slug: string; title: string }> }) {
  return (
    <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {pages.map((p) => (
        <li key={p.slug}>
          <a
            href={`/p/${p.slug}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-foreground">{p.title}</span>
            <span className="font-mono text-xs text-muted-foreground">/p/{p.slug}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
