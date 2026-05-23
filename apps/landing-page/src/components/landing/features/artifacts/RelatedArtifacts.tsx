import { ArrowRight } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import Link from "next/link";
import { getFeatureTitle, type PackageFeatureEntry } from "../package-feature-data";
import { ArtifactSpecimen } from "./ArtifactSpecimen";

type Props = {
  entries: PackageFeatureEntry[];
  lang: string;
  locale: "en" | "zh";
};

export function RelatedArtifacts({ entries, lang, locale }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-[1400px] px-4 pt-24 pb-24 sm:px-6 lg:px-8">
      <AnimateIn preset="fade" inView>
        <div className="flex items-end justify-between border-b border-border/40 pb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {locale === "zh" ? "同族标本" : "related artifacts"}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground/60">
            {locale === "zh" ? "同能力域" : "same capability domain"}
          </div>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="normal" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((related) => {
          const title = getFeatureTitle(related, locale);
          return (
            <AnimateIn key={related.slug} preset="fadeUp">
              <Link
                className="group/related relative block overflow-hidden rounded-[var(--radius-sm)] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                href={`/${lang}/features/${related.slug}`}
                style={{
                  borderColor: "color-mix(in oklch, var(--foreground), transparent 88%)",
                  background: "color-mix(in oklch, var(--background), transparent 8%)",
                }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <ArtifactSpecimen entry={related} locale={locale} compact />
                </div>
                <div
                  className="flex items-center justify-between gap-3 border-t px-4 py-3"
                  style={{ borderColor: "color-mix(in oklch, var(--foreground), transparent 88%)" }}
                >
                  <div className="min-w-0">
                    <div
                      className="truncate font-mono text-[10px] uppercase tracking-[0.32em]"
                      style={{ color: related.tone.accent }}
                      translate="no"
                    >
                      {related.tone.label}
                    </div>
                    <div
                      className="mt-0.5 truncate text-sm font-semibold text-foreground"
                      translate="no"
                    >
                      {title}
                    </div>
                  </div>
                  <ArrowRight
                    className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/related:text-foreground"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </AnimateIn>
          );
        })}
      </AnimateInGroup>
    </section>
  );
}
