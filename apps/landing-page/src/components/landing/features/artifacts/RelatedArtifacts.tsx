import { ArrowRight } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { MagicCard } from "@nebutra/ui/primitives";
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
                href={`/${lang}/features/${related.slug}`}
                className="group/related block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-md)]"
              >
                <MagicCard
                  className="overflow-hidden rounded-[var(--radius-md)]"
                  gradientSize={200}
                  gradientFrom={related.tone.accent}
                  gradientTo={related.tone.secondary}
                  gradientColor={related.tone.chip}
                >
                  <div
                    className="dark relative aspect-[4/3] w-full overflow-hidden"
                    style={{
                      colorScheme: "dark",
                      background:
                        "radial-gradient(ellipse at 50% 0%, oklch(0.20 0.018 260) 0%, oklch(0.10 0.010 245) 90%)",
                    }}
                  >
                    <ArtifactSpecimen entry={related} locale={locale} compact />
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-3">
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
                </MagicCard>
              </Link>
            </AnimateIn>
          );
        })}
      </AnimateInGroup>
    </section>
  );
}
