import { pickMessages } from "@nebutra/i18n/messages";
import { Globe } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { FeatureHero } from "@/components/landing/features/FeatureHero";
import {
  DEFAULT_GROUP_TOKENS,
  type FeatureGroupTokens,
} from "@/components/landing/features/feature-group-tokens";
import { VcDirectory } from "@/components/landing/solutions/vc/VcDirectory";
import type { Locale } from "@/i18n/routing";
import {
  GLOBAL_VC_COUNT,
  GLOBAL_VC_ORGS,
  GLOBAL_VC_REGIONS,
  GLOBAL_VC_SECTORS,
  GLOBAL_VC_TYPES,
  globalVcLogoFor,
} from "@/lib/constants/global-vc";
import { getSolution, getSolutionGroup } from "@/lib/constants/solutions-data";

/** Reads a dynamic dotted path out of `solutionsCatalog` — the slug is data, not a literal key. */
type CatalogTranslator = (key: string) => string;

export interface GlobalVcSolutionProps {
  locale: Locale;
}

/** Custom `/solutions/global-vc` page — a curated directory of global VCs. */
export async function GlobalVcSolution({ locale }: GlobalVcSolutionProps) {
  const solution = getSolution("global-vc");
  const group = solution ? getSolutionGroup(solution.groupId) : undefined;
  const t = (await getTranslations({
    locale,
    namespace: "solutionsCatalog",
  })) as unknown as CatalogTranslator;

  const tokens: FeatureGroupTokens = {
    auroraColors: group?.auroraColors ?? DEFAULT_GROUP_TOKENS.auroraColors,
    ambient: "subtle",
    icon: Globe,
    docsPath: "",
  };

  const stats = [
    { value: GLOBAL_VC_COUNT, label: t("globalVc.statFunds") },
    { value: GLOBAL_VC_SECTORS.length, label: t("globalVc.statSectors") },
    { value: GLOBAL_VC_REGIONS.length, label: t("globalVc.statRegions") },
  ];

  return (
    <>
      {solution ? (
        <FeatureHero
          align="left"
          tokens={tokens}
          backHref="/solutions"
          backLabel={t("globalVc.back")}
          eyebrow={t(`solutions.${solution.slug}.hero.eyebrow`)}
          titlePrefix={t(`solutions.${solution.slug}.hero.title`)}
          titleSuffix={t(`solutions.${solution.slug}.hero.titleAccent`)}
          summary={t(`solutions.${solution.slug}.hero.summary`)}
        >
          <div className="mt-8 flex gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-neutral-12 md:text-3xl">{s.value}</div>
                <div className="text-xs text-muted-foreground/70">{s.label}</div>
              </div>
            ))}
          </div>
        </FeatureHero>
      ) : null}

      <section className="pb-20 pt-4 md:pb-28">
        <AnimateIn preset="fadeUp" inView>
          <NextIntlClientProvider
            locale={locale}
            messages={pickMessages(await getMessages({ locale }), ["solutionsCatalog.vcDirectory"])}
          >
            <VcDirectory
              orgs={GLOBAL_VC_ORGS.map((o) => ({ ...o, logo: globalVcLogoFor(o) }))}
              sectors={GLOBAL_VC_SECTORS}
              types={GLOBAL_VC_TYPES}
              variant="global"
              hrefBase="/solutions/global-vc"
            />
          </NextIntlClientProvider>
        </AnimateIn>

        <p className="mx-auto mt-12 max-w-wide px-4 text-xs leading-relaxed text-muted-foreground/60 md:px-6">
          {t("globalVc.source")}
        </p>
      </section>
    </>
  );
}
