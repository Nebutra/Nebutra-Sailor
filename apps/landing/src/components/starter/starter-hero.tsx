import { brand } from "@nebutra/brand/metadata";
import { ArrowRight } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import { SITE } from "@/content/site";
import { say } from "./starter-copy";
import { StarterLink } from "./starter-link";

/**
 * The first screen: your brand's name, the one-line pitch from
 * src/content/site.ts, two calls to action and a quiet product frame.
 */
export function StarterHero({ locale }: { locale: string }) {
  const { hero } = SITE;
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden px-4 pt-32 pb-16 md:px-6 md:pt-40 md:pb-24"
    >
      <div
        aria-hidden="true"
        className="-z-10 absolute inset-0 bg-[linear-gradient(to_right,var(--neutral-4)_1px,transparent_1px),linear-gradient(to_bottom,var(--neutral-4)_1px,transparent_1px)] bg-[size:56px_56px] opacity-60 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div className="mx-auto flex max-w-text flex-col items-center text-center">
        <AnimateIn preset="emerge">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-ambient-sm">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            {say(hero.eyebrow, locale)}
          </span>
        </AnimateIn>
        <AnimateIn preset="emerge">
          <h1
            id="hero-title"
            className="mt-6 text-balance text-5xl font-semibold tracking-tight text-foreground md:text-7xl"
          >
            {brand.name}
          </h1>
        </AnimateIn>
        <AnimateIn preset="emerge">
          <p className="mt-5 max-w-2xl text-balance text-xl text-foreground/80 md:text-2xl">
            {say(hero.pitch, locale)}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground">
            {say(hero.body, locale)}
          </p>
        </AnimateIn>
        <AnimateIn preset="fadeUp">
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="ink">
              <StarterLink href={hero.primary.href}>
                {say(hero.primary.label, locale)}
                <ArrowRight aria-hidden="true" />
              </StarterLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <StarterLink href={hero.secondary.href}>
                {say(hero.secondary.label, locale)}
              </StarterLink>
            </Button>
          </div>
        </AnimateIn>
      </div>

      <AnimateIn preset="fadeUp">
        <ProductFrame />
      </AnimateIn>
    </section>
  );
}

/** A drawn, not photographed, product window — replace it with a screenshot of yours. */
function ProductFrame() {
  const rows = [72, 56, 64, 48, 60];
  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-16 max-w-content overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-ambient-lg md:mt-20"
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
              <div key={i} className="rounded-[var(--radius-md)] border border-border p-4">
                <span className="block h-2 w-16 rounded-full bg-neutral-5" />
                <span className="mt-4 block h-5 w-20 rounded-[var(--radius-sm)] bg-neutral-4" />
              </div>
            ))}
          </div>
          <div className="mt-5 divide-y divide-border rounded-[var(--radius-md)] border border-border">
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
