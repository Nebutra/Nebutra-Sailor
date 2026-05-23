import { ArrowRight } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import Link from "next/link";
import {
  getFeatureSummary,
  getFeatureTitle,
  getGroupLabel,
  type PackageFeatureEntry,
} from "../package-feature-data";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  lang: string;
};

const COPY = {
  back: { en: "all artifacts", zh: "返回特性集" },
  capability: { en: "capability artifact", zh: "能力工艺品" },
  specimen: { en: "specimen", zh: "标本编号" },
  owner: { en: "owner", zh: "所有者" },
  path: { en: "boundary", zh: "源码边界" },
} as const;

function splitTitle(title: string): [string, string] {
  if (title.length < 14) return [title, ""];
  const tokens = title.split(/\s+/);
  if (tokens.length === 1) return [title, ""];
  const mid = Math.ceil(tokens.length / 2);
  return [tokens.slice(0, mid).join(" "), tokens.slice(mid).join(" ")];
}

export function ArtifactHero({ entry, locale, lang }: Props) {
  const title = getFeatureTitle(entry, locale);
  const summary = getFeatureSummary(entry, locale);
  const [headA, headB] = splitTitle(title);
  const groupLabel = getGroupLabel(entry.group, locale);

  return (
    <header className="relative">
      {/* tiny back link — floats top-left */}
      <AnimateIn preset="fade">
        <Link
          className="group/back inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground transition-colors hover:text-foreground"
          href={`/${lang}/features`}
        >
          <ArrowRight className="size-3 rotate-180" aria-hidden="true" />
          <span>{COPY.back[locale]}</span>
        </Link>
      </AnimateIn>

      {/* eyebrow */}
      <AnimateIn preset="fade" delay={0.05}>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          <span style={{ color: entry.tone.accent }}>{entry.tone.label}</span>
          <span className="text-foreground/30">·</span>
          <span>{COPY.capability[locale]}</span>
          <span className="text-foreground/30">·</span>
          <span className="font-mono" translate="no">
            {entry.path}
          </span>
        </div>
      </AnimateIn>

      {/* oversized title — leading and letter-spacing tuned to fit both
          Latin and CJK glyphs. CJK characters need ≥1.0 leading because
          their em-square fills the line box; combined with background-clip:text,
          tighter leading clips the top of glyphs. */}
      <AnimateIn preset="fadeUp" delay={0.1}>
        <h1
          className="mt-6 text-[3rem] font-semibold leading-[1.08] sm:text-[4.5rem] sm:leading-[1.05] lg:text-[6.5rem]"
          style={{
            letterSpacing: "-0.02em",
            color: "var(--foreground)",
          }}
        >
          <span className="block pb-1">{headA}</span>
          {headB ? (
            <span
              className="block pb-2"
              style={{
                background: entry.tone.gradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                paddingTop: "0.08em",
              }}
            >
              {headB}
            </span>
          ) : null}
        </h1>
      </AnimateIn>

      {/* one short paragraph */}
      <AnimateIn preset="fadeUp" delay={0.18}>
        <p className="mt-8 max-w-[var(--container-text)] text-base leading-relaxed text-muted-foreground sm:text-lg">
          {summary}
        </p>
      </AnimateIn>

      {/* ambient annotations — grouped under hero, not buttons */}
      <AnimateIn preset="fade" delay={0.26}>
        <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 font-mono text-[11px] uppercase tracking-[0.18em] sm:grid-cols-3 sm:gap-x-12">
          <div>
            <dt className="text-muted-foreground/70">{COPY.owner[locale]}</dt>
            <dd className="mt-1 truncate text-foreground" translate="no">
              {groupLabel}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground/70">{COPY.specimen[locale]}</dt>
            <dd className="mt-1 truncate text-foreground" translate="no">
              NB·{entry.slug.slice(0, 6).toUpperCase()}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-muted-foreground/70">{COPY.path[locale]}</dt>
            <dd className="mt-1 truncate text-foreground/85" translate="no">
              {entry.path}
            </dd>
          </div>
        </dl>
      </AnimateIn>
    </header>
  );
}
