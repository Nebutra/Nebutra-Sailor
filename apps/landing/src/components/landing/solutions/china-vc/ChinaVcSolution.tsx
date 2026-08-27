import { Analytics } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
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
import { getSolution, getSolutionGroup, pick } from "@/lib/constants/solutions-data";
import { isZhUiLocale } from "@/lib/i18n/localized";

const COPY = {
  back: { en: "All solutions", zh: "全部解决方案" },
  statInstitutions: { en: "Institutions", zh: "家机构" },
  statSectors: { en: "Sectors", zh: "个赛道" },
  statDeals: { en: "Deals tracked", zh: "笔投资" },
  source: {
    en: "Compiled from public information on China's direct-investment institutions.",
    zh: "整理自中国主流直投机构的公开信息。",
  },
} as const;

export interface ChinaVcSolutionProps {
  locale: Locale;
}

/** Custom `/solutions/china-vc` page — a searchable directory of China VCs. */
export function ChinaVcSolution({ locale }: ChinaVcSolutionProps) {
  const solution = getSolution("china-vc");
  const group = solution ? getSolutionGroup(solution.groupId) : undefined;
  const copyLocale: "en" | "zh" = isZhUiLocale(locale) ? "zh" : "en";
  const text = (key: keyof typeof COPY) => (isZhUiLocale(locale) ? COPY[key].zh : COPY[key].en);

  const tokens: FeatureGroupTokens = {
    auroraColors: group?.auroraColors ?? DEFAULT_GROUP_TOKENS.auroraColors,
    ambient: "subtle",
    icon: Analytics,
    docsPath: "",
  };

  const stats = [
    { value: CHINA_VC_COUNT, label: text("statInstitutions") },
    { value: CHINA_VC_SECTORS.length, label: text("statSectors") },
    { value: CHINA_VC_TOTAL_DEALS.toLocaleString("en-US"), label: text("statDeals") },
  ];

  return (
    <>
      {solution ? (
        <FeatureHero
          align="left"
          tokens={tokens}
          backHref="/solutions"
          backLabel={text("back")}
          eyebrow={pick(solution.hero.eyebrow, locale)}
          titlePrefix={pick(solution.hero.title, locale)}
          titleSuffix={pick(solution.hero.titleAccent, locale)}
          summary={pick(solution.hero.summary, locale)}
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
          <VcDirectory
            orgs={CHINA_VC_ORGS.map((o) => ({ ...o, logo: chinaVcLogoFor(o) }))}
            sectors={CHINA_VC_SECTORS}
            types={CHINA_VC_TYPES}
            locale={copyLocale}
            variant="deals"
            hrefBase="/solutions/china-vc"
          />
        </AnimateIn>

        <p className="mx-auto mt-12 max-w-[1400px] px-4 text-xs leading-relaxed text-muted-foreground/60 md:px-6">
          {text("source")}
        </p>
      </section>
    </>
  );
}
