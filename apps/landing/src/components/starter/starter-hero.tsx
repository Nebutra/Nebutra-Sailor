import { brand } from "@nebutra/brand/metadata";
import { ArrowRight } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/content/site";
import { MaskedHeadline } from "@/shared/animation/masked-headline";
import { StarterLink } from "./starter-link";

/**
 * The first screen: your brand's name, the one-line pitch from
 * messages/en.json → site.hero, two calls to action and one product frame.
 * Nothing sits above the name.
 *
 * Motion (Landing Motion System): the name rises out of its mask on first
 * paint and the product frame settles in after it — one timeline, CSS only,
 * so the pitch and buttons are readable and clickable from the first frame and
 * the page is complete with JavaScript off. Reduced motion: all at rest.
 */
export async function StarterHero({ locale }: { locale: string }) {
  const { hero } = SITE;
  const t = await getTranslations({ locale, namespace: "site.hero" });
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden px-4 pt-32 pb-16 md:px-6 md:pt-40 md:pb-28"
    >
      <div className="mx-auto flex max-w-text flex-col items-center text-center">
        <h1
          id="hero-title"
          className="font-heading text-balance text-5xl tracking-tight text-foreground [font-weight:var(--font-weight-heading,500)] md:text-7xl"
        >
          <MaskedHeadline locale={locale}>{brand.name}</MaskedHeadline>
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-xl text-foreground/80 md:text-2xl">
          {t("pitch")}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground">
          {t("body")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="ink">
            <StarterLink href={hero.primary.href}>
              {t("primaryLabel")}
              <ArrowRight aria-hidden="true" />
            </StarterLink>
          </Button>
          <Button asChild size="lg" variant="outline">
            <StarterLink href={hero.secondary.href}>{t("secondaryLabel")}</StarterLink>
          </Button>
        </div>
      </div>

      <ProductFrame />
    </section>
  );
}

/**
 * A drawn, not photographed, product window — replace it with a screenshot of
 * yours. One hairline frame; everything inside it is tonal fill, so there is
 * no box inside the box.
 */
function ProductFrame() {
  const rows = [72, 56, 64, 48, 60];
  return (
    <div
      aria-hidden="true"
      className="hero-visual mx-auto mt-16 max-w-content overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card md:mt-20"
    >
      <div className="flex h-10 items-center gap-1.5 border-b border-border px-4">
        <span className="size-2.5 rounded-full bg-neutral-5" />
        <span className="size-2.5 rounded-full bg-neutral-5" />
        <span className="size-2.5 rounded-full bg-neutral-5" />
        <span className="ml-4 h-5 w-48 rounded-[var(--radius-sm)] bg-neutral-3" />
      </div>
      <div className="grid min-h-72 grid-cols-[11rem_1fr] md:min-h-96 max-md:grid-cols-1">
        <div className="space-y-2 border-r border-border bg-neutral-2 p-4 max-md:hidden">
          <span className="mb-4 block h-6 w-24 rounded-[var(--radius-sm)] bg-neutral-4" />
          {[80, 64, 72, 56].map((w, i) => (
            <span
              key={w}
              className={`block h-7 rounded-[var(--radius-sm)] ${i === 0 ? "bg-neutral-4" : "bg-transparent"}`}
            >
              <span
                className="mt-2.5 ml-2 block h-2 rounded-full bg-neutral-6"
                style={{ width: `${w}%` }}
              />
            </span>
          ))}
        </div>
        <div className="p-5 md:p-8">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-[var(--radius-md)] bg-neutral-2 p-4">
                <span className="block h-2 w-16 rounded-full bg-neutral-5" />
                <span className="mt-4 block h-5 w-20 rounded-[var(--radius-sm)] bg-neutral-4" />
              </div>
            ))}
          </div>
          <div className="mt-5 divide-y divide-border rounded-[var(--radius-md)] bg-neutral-2">
            {rows.map((w) => (
              <div key={w} className="flex items-center gap-3 px-4 py-3">
                <span className="size-6 shrink-0 rounded-full bg-neutral-4" />
                <span className="h-2 rounded-full bg-neutral-5" style={{ width: `${w}%` }} />
                <span className="ml-auto h-5 w-14 shrink-0 rounded-full bg-neutral-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
