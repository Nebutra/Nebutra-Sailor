import { Globe } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { FeatureHero } from "@/components/landing/features/FeatureHero";
import type { FeatureGroupTokens } from "@/components/landing/features/feature-group-tokens";
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
import { getSolution, getSolutionGroup, pick } from "@/lib/constants/solutions-data";

const COPY = {
  back: { en: "All solutions", zh: "全部解决方案" },
  statFunds: { en: "Funds", zh: "家基金" },
  statSectors: { en: "Sectors", zh: "个领域" },
  statRegions: { en: "Regions", zh: "个地区" },
  source: {
    en: "A curated set of well-known global investors. Profiles compiled from public information.",
    zh: "精选的全球知名投资机构,资料整理自公开信息。",
  },
} as const;

export interface GlobalVcSolutionProps {
  locale: Locale;
}

/** Custom `/solutions/global-vc` page — a curated directory of global VCs. */
export function GlobalVcSolution({ locale }: GlobalVcSolutionProps) {
  const solution = getSolution("global-vc");
  const group = solution ? getSolutionGroup(solution.groupId) : undefined;
  const copyLocale: "en" | "zh" = locale === "zh" ? "zh" : "en";
  const text = (key: keyof typeof COPY) => (locale === "zh" ? COPY[key].zh : COPY[key].en);

  const tokens: FeatureGroupTokens = {
    auroraColors: group?.auroraColors ?? ["#0033FE", "#0BF1C3", "#06b6d4", "#38bdf8"],
    ambient: "subtle",
    icon: Globe,
    docsPath: "",
  };

  const stats = [
    { value: GLOBAL_VC_COUNT, label: text("statFunds") },
    { value: GLOBAL_VC_SECTORS.length, label: text("statSectors") },
    { value: GLOBAL_VC_REGIONS.length, label: text("statRegions") },
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
            orgs={GLOBAL_VC_ORGS}
            sectors={GLOBAL_VC_SECTORS}
            types={GLOBAL_VC_TYPES}
            locale={copyLocale}
            variant="global"
            logoFor={globalVcLogoFor}
          />
        </AnimateIn>

        <p className="mx-auto mt-12 max-w-[1400px] px-4 text-xs leading-relaxed text-muted-foreground/60 md:px-6">
          {text("source")}
        </p>
      </section>
    </>
  );
}
