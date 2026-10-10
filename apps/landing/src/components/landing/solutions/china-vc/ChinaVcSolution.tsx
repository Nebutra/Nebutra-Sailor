import { pickMessages } from "@nebutra/i18n/messages";
import { Analytics } from "@nebutra/icons";
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
  CHINA_VC_COUNT,
  CHINA_VC_ORGS,
  CHINA_VC_SECTORS,
  CHINA_VC_TOTAL_DEALS,
  CHINA_VC_TYPES,
  chinaVcLogoFor,
} from "@/lib/constants/china-vc";
import { getSolution, getSolutionGroup } from "@/lib/constants/solutions-data";

/** Reads a dynamic dotted path out of `solutionsCatalog` — the slug is data, not a literal key. */
type CatalogTranslator = (key: string) => string;

export interface ChinaVcSolutionProps {
  locale: Locale;
}

/** Custom `/solutions/china-vc` page — a searchable directory of China VCs. */
export async function ChinaVcSolution({ locale }: ChinaVcSolutionProps) {
  const solution = getSolution("china-vc");
  const group = solution ? getSolutionGroup(solution.groupId) : undefined;
  const t = (await getTranslations({
    locale,
    namespace: "solutionsCatalog",
  })) as unknown as CatalogTranslator;

  const tokens: FeatureGroupTokens = {
    auroraColors: group?.auroraColors ?? DEFAULT_GROUP_TOKENS.auroraColors,
    ambient: "subtle",
    icon: Analytics,
    docsPath: "",
  };

  const stats = [
    { value: CHINA_VC_COUNT, label: t("chinaVc.statInstitutions") },
    { value: CHINA_VC_SECTORS.length, label: t("chinaVc.statSectors") },
    { value: CHINA_VC_TOTAL_DEALS.toLocaleString("en-US"), label: t("chinaVc.statDeals") },
  ];

  return (
    <>
      {solution ? (
        <FeatureHero
          align="left"
          tokens={tokens}
          backHref="/solutions"
          backLabel={t("chinaVc.back")}
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
              orgs={CHINA_VC_ORGS.map((o) => ({ ...o, logo: chinaVcLogoFor(o) }))}
              sectors={CHINA_VC_SECTORS}
              types={CHINA_VC_TYPES}
              variant="deals"
              hrefBase="/solutions/china-vc"
            />
          </NextIntlClientProvider>
        </AnimateIn>

        <p className="mx-auto mt-12 max-w-wide px-4 text-xs leading-relaxed text-muted-foreground/60 md:px-6">
          {t("chinaVc.source")}
        </p>
      </section>
    </>
  );
}
