import { AnimateIn } from "@nebutra/ui/components";
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

      {/* full-bleed ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[820px]"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${entry.tone.halo}, transparent 60%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff14_1px,transparent_1px)] opacity-[0.07] [background-size:24px_24px]"
      />

      {/* hero + specimen */}
      <section className="relative mx-auto max-w-[1400px] px-4 pt-32 pb-12 sm:px-6 lg:px-8">
        <ArtifactHero entry={entry} locale={locale} lang={lang} />
      </section>

      <section className="relative mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
        <AnimateIn preset="emerge" inView>
          <div
            className="relative overflow-hidden rounded-[var(--radius-panel)] border backdrop-blur-md"
            style={{
              borderColor: entry.tone.hairline,
              background: `color-mix(in oklch, var(--background), transparent 14%)`,
              boxShadow: "var(--ring-hairline)",
            }}
          >
            {/* specimen header strip */}
            <div
              className="flex items-center justify-between border-b px-5 py-3"
              style={{ borderColor: "color-mix(in oklch, var(--foreground), transparent 88%)" }}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: entry.tone.accent }}
                    aria-hidden="true"
                  />
                  <span
                    className="size-2 rounded-full"
                    style={{ background: entry.tone.secondary }}
                    aria-hidden="true"
                  />
                  <span
                    className="size-2 rounded-full"
                    style={{
                      background: "color-mix(in oklch, var(--foreground), transparent 70%)",
                    }}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
                  translate="no"
                >
                  specimen · {entry.visualVariant}
                </span>
              </div>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
                translate="no"
              >
                {entry.path}
              </span>
            </div>

            <ArtifactSpecimen entry={entry} locale={locale} />
          </div>
        </AnimateIn>
      </section>

      {/* minimal contracts strip — only when there are children */}
      {hasChildren ? (
        <section className="relative mx-auto max-w-[1400px] px-4 pb-8 sm:px-6 lg:px-8">
          <AnimateIn preset="fade" inView>
            <div
              className="border-t border-b py-6"
              style={{ borderColor: "color-mix(in oklch, var(--foreground), transparent 88%)" }}
            >
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

      {/* related artifacts rail */}
      <RelatedArtifacts entries={related} lang={lang} locale={locale} />

      <FooterMinimal />
    </main>
  );
}
