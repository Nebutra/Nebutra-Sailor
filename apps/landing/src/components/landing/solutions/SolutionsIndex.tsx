import { ArrowUpRight } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { MagicCard } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getGroupSolutions, SOLUTION_GROUPS } from "@/lib/constants/solutions-data";

/** Reads a dynamic dotted path out of `solutionsCatalog` — the group id / slug is data, not a literal key. */
type CatalogTranslator = (key: string) => string;

export interface SolutionsIndexProps {
  locale: Locale;
}

/** `/solutions` index — grouped scenario cards, one section per group. */
export async function SolutionsIndex({ locale }: SolutionsIndexProps) {
  type LocalizedHref = Parameters<typeof Link>[0]["href"];
  const t = (await getTranslations({
    locale,
    namespace: "solutionsCatalog",
  })) as unknown as CatalogTranslator;

  return (
    <div className="mx-auto max-w-wide px-4 pb-24 pt-28 md:px-6 md:pt-36">
      <AnimateIn preset="emerge">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground/70">
          {t("index.eyebrow")}
        </p>
        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-neutral-12 md:text-5xl">
          {t("index.title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-11 md:text-lg">
          {t("index.summary")}
        </p>
      </AnimateIn>

      <div className="mt-16 flex flex-col gap-16">
        {SOLUTION_GROUPS.map((group) => (
          <section key={group.id}>
            <AnimateIn preset="fadeUp" inView>
              <h2 className="mb-6 text-xl font-bold text-neutral-12 md:text-2xl">
                {t(`groups.${group.id}.label`)}
              </h2>
            </AnimateIn>
            <AnimateInGroup stagger="normal" className="grid gap-6 md:grid-cols-3">
              {getGroupSolutions(group).map((s) => {
                const Icon = s.icon;
                return (
                  <AnimateIn key={s.slug} preset="fadeUp">
                    <Link
                      href={`/solutions/${s.slug}` as LocalizedHref}
                      className="group block h-full"
                    >
                      <MagicCard className="flex h-full flex-col rounded-[var(--radius-2xl)] border border-border/60 p-6">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-xl)] bg-muted/60">
                            <Icon className="h-5 w-5 text-neutral-12" />
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-neutral-12">
                          {t(`solutions.${s.slug}.label`)}
                        </h3>
                        <p className="text-sm leading-relaxed text-neutral-11">
                          {t(`solutions.${s.slug}.tagline`)}
                        </p>
                      </MagicCard>
                    </Link>
                  </AnimateIn>
                );
              })}
            </AnimateInGroup>
          </section>
        ))}
      </div>
    </div>
  );
}
