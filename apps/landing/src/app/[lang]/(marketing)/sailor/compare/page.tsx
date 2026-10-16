import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { REPO_URL } from "@/nebutra/data/repo";
import { siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

/**
 * Sailor beside the starters people weigh it against. Facts only, each one
 * traceable to the project's own README, pricing page or source, and dated:
 * a cell the project does not state says so instead of guessing. Re-check the
 * whole table when a column's source changes; the date lives in the messages
 * (`sitePages.sailorCompare.table.lead`).
 */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "sitePages.sailorCompare" });
  return buildPageMetadata(
    await sitePageMeta(lang, "/sailor/compare", { description: t("hero.lead") }),
  );
}

const PROJECTS = ["sailor", "vibestart", "shipfast", "supastarter", "t3"] as const;
type Project = (typeof PROJECTS)[number];

const PROJECT_NAMES: Record<Project, string> = {
  sailor: "Sailor",
  vibestart: "vibestart",
  shipfast: "ShipFast",
  supastarter: "Supastarter",
  t3: "create-t3-app",
};

/** Where each column's facts came from; the column header links here. */
const PROJECT_SOURCES: Record<Project, string> = {
  sailor: REPO_URL,
  vibestart: "https://github.com/VinkyDev/vibestart",
  shipfast: "https://shipfa.st",
  supastarter: "https://supastarter.dev",
  t3: "https://github.com/t3-oss/create-t3-app",
};

const ROWS = [
  "license",
  "price",
  "framework",
  "auth",
  "payments",
  "tenancy",
  "api",
  "i18n",
  "agents",
  "start",
  "bestFor",
] as const;
type Row = (typeof ROWS)[number];

/** "When to pick something else" names the others first; Sailor's own case comes last. */
const PICK_ORDER: readonly Project[] = ["vibestart", "t3", "shipfast", "supastarter", "sailor"];

/** Rows whose cells are commands or file names, set in the mono face. */
const CODE_ROWS: ReadonlySet<Row> = new Set(["start"]);

export default async function SailorComparePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "sitePages.sailorCompare" });
  const key = (k: string) => k as Parameters<typeof t>[0];

  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          lang={lang}
          title={t("hero.title")}
          lead={t("hero.lead")}
          cn={zh ? undefined : t("hero.cn")}
        />
      </section>

      <Band>
        <Intro title={t("table.title")} lead={t("table.lead")} />
        <div className="mt-12 overflow-x-auto rounded-xl border border-border bg-background">
          <Table bare className="w-full min-w-[960px] text-left text-sm">
            <TableCaption className="sr-only">{t("table.caption")}</TableCaption>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead
                  scope="col"
                  alignment="start"
                  className="sticky left-0 z-10 w-40 bg-muted text-sm font-medium text-muted-foreground"
                >
                  {t("table.aspect")}
                </TableHead>
                {PROJECTS.map((p) => (
                  <TableHead key={p} scope="col" alignment="start" className="text-sm">
                    <a
                      href={PROJECT_SOURCES[p]}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {PROJECT_NAMES[p]}
                    </a>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row} className="border-t border-border align-top">
                  <TableHead
                    scope="row"
                    alignment="start"
                    className="sticky left-0 z-10 bg-background text-sm font-medium text-foreground"
                  >
                    {t(key(`table.rows.${row}`))}
                  </TableHead>
                  {PROJECTS.map((p) => (
                    <TableCell
                      key={p}
                      alignment="start"
                      className={
                        p === "sailor"
                          ? "text-sm leading-6 text-foreground"
                          : "text-sm leading-6 text-muted-foreground"
                      }
                    >
                      {CODE_ROWS.has(row) ? (
                        <code className="font-mono text-xs">
                          {t(key(`table.cells.${p}.${row}`))}
                        </code>
                      ) : (
                        t(key(`table.cells.${p}.${row}`))
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Band>

      <Band>
        <Intro title={t("pick.title")} lead={t("pick.lead")} />
        <ul className="mt-12 max-w-4xl divide-y divide-border border-y border-border">
          {PICK_ORDER.map((p) => (
            <li
              key={p}
              className="grid grid-cols-1 gap-1 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
            >
              <span className="text-base text-foreground">{PROJECT_NAMES[p]}</span>
              <span className="text-base leading-7 text-secondary-foreground">
                {t(key(`pick.items.${p}`))}
              </span>
            </li>
          ))}
        </ul>
      </Band>

      <Band>
        <Intro title={t("sources.title")} lead={t("sources.lead")} />
        <ul className="mt-10 max-w-3xl space-y-3 text-sm">
          {PROJECTS.map((p) => (
            <li key={p}>
              <a
                href={PROJECT_SOURCES[p]}
                className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t(key(`sources.items.${p}`))}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <a
            href={`${REPO_URL}/issues/new`}
            className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("sources.report")}
          </a>
          <Link
            href="/sailor"
            className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Sailor →
          </Link>
        </p>
      </Band>
    </main>
  );
}
