import { AnimateIn } from "@nebutra/ui/components";
import { Badge } from "@nebutra/ui/primitives";
import Link from "next/link";
import { FooterMinimal, Navbar } from "@/components/landing";
import { getRelatedEntries, type PackageFeatureEntry } from "../package-feature-data";
import { ArtifactHero } from "./ArtifactHero";
import { ArtifactSpecimen } from "./ArtifactSpecimen";
import { RelatedArtifacts } from "./RelatedArtifacts";

type Props = {
  entry: PackageFeatureEntry;
  lang: string;
  locale: "en" | "zh";
};

const COPY = {
  contracts: { en: "contracts", zh: "契约" },
  packages: { en: "packages", zh: "包" },
} as const;

export function FeatureArtifactPage({ entry, lang, locale }: Props) {
  const related = getRelatedEntries(entry, 4);
  const hasChildren = entry.children.length > 0;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
      id="main-content"
    >
      <Navbar />

      {/* hero */}
      <section className="relative mx-auto max-w-[1400px] px-4 pt-32 pb-12 sm:px-6 lg:px-8">
        <ArtifactHero entry={entry} locale={locale} lang={lang} />
      </section>

      {/* specimen stage — dark-locked museum case */}
      <section className="relative mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <div
            className="dark relative overflow-hidden rounded-[var(--radius-panel)] border border-border"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, oklch(0.22 0.018 260) 0%, oklch(0.12 0.012 250) 70%, oklch(0.08 0.008 245) 100%)",
              colorScheme: "dark",
            }}
          >
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
              <Badge variant="outline" size="sm" className="font-mono uppercase tracking-[0.18em]">
                specimen · {entry.visualVariant}
              </Badge>
              <span
                className="truncate font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
                translate="no"
              >
                {entry.path}
              </span>
            </div>

            <ArtifactSpecimen entry={entry} locale={locale} />
          </div>
        </AnimateIn>
      </section>

      {/* contracts strip */}
      {hasChildren ? (
        <section className="relative mx-auto max-w-[1400px] px-4 pb-8 sm:px-6 lg:px-8">
          <AnimateIn preset="fade" inView>
            <div className="border-t border-b border-border/40 py-6">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                <span>{COPY.contracts[locale]}</span>
                <span>
                  {entry.children.length} {COPY.packages[locale]}
                </span>
              </div>
              <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {entry.children.map((child) => (
                  <li key={child}>
                    <Link
                      className="group/contract flex items-center justify-between font-mono text-sm text-foreground/85 transition-colors hover:text-foreground"
                      href={`/${lang}/features/${child}`}
                      translate="no"
                    >
                      <span className="truncate">
                        <span className="text-foreground/40 group-hover/contract:text-foreground/70">
                          /
                        </span>
                        {child}
                      </span>
                      <span
                        className="ml-3 shrink-0 text-foreground/30 transition-colors group-hover/contract:text-foreground/70"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </AnimateIn>
        </section>
      ) : null}

      <RelatedArtifacts entries={related} lang={lang} locale={locale} />

      <FooterMinimal />
    </main>
  );
}
