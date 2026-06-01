import { ArrowRight, ArrowUpRight } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { Badge } from "@nebutra/ui/primitives";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { VcOrg } from "@/lib/constants/vc";
import { VcLogo } from "./VcLogo";

const COPY = {
  home: { en: "Home", zh: "首页" },
  thesis: { en: "Investment focus", zh: "投资主线" },
  facts: { en: "At a glance", zh: "速览" },
  founded: { en: "Founded", zh: "成立" },
  hq: { en: "HQ", zh: "总部" },
  stages: { en: "Stages", zh: "阶段" },
  checkSize: { en: "Check size", zh: "单笔" },
  totalDeals: { en: "Total deals", zh: "总投资" },
  region: { en: "Region", zh: "地域" },
  sectors: { en: "Sectors", zh: "赛道" },
  notable: { en: "Notable portfolio", zh: "代表案例" },
  recent: { en: "Recent activity (2025–26)", zh: "近期出手(2025–26)" },
  similar: { en: "Similar institutions", zh: "同赛道机构" },
  visit: { en: "Visit website", zh: "访问官网" },
} as const;

export interface VcProfileProps {
  org: VcOrg;
  similar: VcOrg[];
  locale: Locale;
  /** Directory this profile belongs to, e.g. "China VC". */
  directoryLabel: string;
  /** Base path for back-link + similar cards, e.g. "/solutions/china-vc". */
  hrefBase: string;
  variant: "deals" | "global";
}

export function VcProfile({
  org,
  similar,
  locale,
  directoryLabel,
  hrefBase,
  variant,
}: VcProfileProps) {
  const zh = locale === "zh";
  const t = (k: keyof typeof COPY) => (zh ? COPY[k].zh : COPY[k].en);
  type LocalizedHref = Parameters<typeof Link>[0]["href"];

  const thesis = org.thesis ? (zh ? org.thesis.zh : org.thesis.en) || org.summary : org.summary;
  const facts: { label: string; value: string }[] = [];
  if (org.founded) facts.push({ label: t("founded"), value: String(org.founded) });
  if (org.hq) facts.push({ label: t("hq"), value: org.hq });
  if (org.region) facts.push({ label: t("region"), value: org.region });
  if (org.stages?.length) facts.push({ label: t("stages"), value: org.stages.join(" · ") });
  if (org.checkSize) facts.push({ label: t("checkSize"), value: org.checkSize });
  if (variant === "deals" && typeof org.total === "number")
    facts.push({ label: t("totalDeals"), value: org.total.toLocaleString("en-US") });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    ...(org.nameEn ? { alternateName: org.nameEn } : {}),
    ...(org.website ? { url: org.website } : {}),
    ...(org.founded ? { foundingDate: String(org.founded) } : {}),
    ...(org.summary ? { description: org.summary } : {}),
  };

  return (
    <article className="mx-auto max-w-3xl px-4 pt-28 pb-20 md:px-6">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <AnimateIn preset="fade" inView>
        <nav className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
          <Link href="/solutions" className="transition-colors hover:text-foreground">
            {t("home")}
          </Link>
          <span>›</span>
          <Link
            href={hrefBase as LocalizedHref}
            className="transition-colors hover:text-foreground"
          >
            {directoryLabel}
          </Link>
          <span>›</span>
          <span className="text-foreground">{org.name}</span>
        </nav>
      </AnimateIn>

      <AnimateIn preset="fadeUp" inView>
        <header className="mt-6 flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <VcLogo src={org.logo ?? null} name={org.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-neutral-12 md:text-3xl">{org.name}</h1>
              {org.nameEn ? <p className="text-base text-muted-foreground">{org.nameEn}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {org.types.map((ty) => (
                  <Badge key={ty} variant="outline" className="px-2 py-0.5 text-xs">
                    {ty}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {org.website ? (
            <a
              href={org.website}
              target="_blank"
              rel="noreferrer nofollow"
              className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-lg)] bg-[color:var(--neutral-12)] px-5 py-2.5 font-semibold text-[color:var(--neutral-1)] text-sm transition-opacity hover:opacity-90"
            >
              {t("visit")}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : null}
        </header>
      </AnimateIn>

      {/* Thesis */}
      {thesis ? (
        <AnimateIn preset="fadeUp" inView>
          <section className="mt-10">
            <h2 className="mb-3 border-l-2 border-foreground/70 pl-3 font-semibold text-neutral-12">
              {t("thesis")}
            </h2>
            <p className="text-base leading-relaxed text-neutral-11">{thesis}</p>
          </section>
        </AnimateIn>
      ) : null}

      {/* Facts */}
      {facts.length ? (
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map((f) => (
            <div
              key={f.label}
              className="flex flex-col gap-0.5 rounded-[var(--radius-xl)] border border-border/60 p-4"
            >
              <span className="text-xs text-muted-foreground/70">{f.label}</span>
              <span className="font-semibold text-neutral-12 text-sm">{f.value}</span>
            </div>
          ))}
        </section>
      ) : null}

      {/* Sectors */}
      {org.sectors.length ? (
        <section className="mt-8">
          <h2 className="mb-3 border-l-2 border-foreground/70 pl-3 font-semibold text-neutral-12">
            {t("sectors")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {org.sectors.map((s) => (
              <span key={s} className="rounded-full bg-muted/70 px-3 py-1 text-neutral-11 text-xs">
                {s}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Notable portfolio */}
      {org.notable?.length ? (
        <section className="mt-8">
          <h2 className="mb-3 border-l-2 border-foreground/70 pl-3 font-semibold text-neutral-12">
            {t("notable")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {org.notable.map((n) => (
              <span
                key={n}
                className="rounded-[var(--radius-lg)] border border-border/60 px-3 py-1.5 text-neutral-11 text-sm"
              >
                {n}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Recent activity */}
      {org.recent?.length ? (
        <section className="mt-8">
          <h2 className="mb-3 border-l-2 border-foreground/70 pl-3 font-semibold text-neutral-12">
            {t("recent")}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {org.recent.map((r) => (
              <li key={r} className="flex items-start gap-2 text-neutral-11 text-sm">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />
                {r}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Similar */}
      {similar.length ? (
        <section className="mt-12 border-t border-border/40 pt-8">
          <h2 className="mb-4 font-semibold text-neutral-12">{t("similar")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`${hrefBase}/${s.id}` as LocalizedHref}
                className="group flex items-center gap-3 rounded-[var(--radius-xl)] border border-border/60 p-3 transition-colors hover:border-foreground/30"
              >
                <VcLogo src={s.logo ?? null} name={s.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-12 text-sm">
                    {s.name}
                  </span>
                  <span className="block truncate text-muted-foreground/80 text-xs">
                    {s.sectors.slice(0, 3).join(" · ")}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
