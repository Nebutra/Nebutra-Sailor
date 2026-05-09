import { useTranslations } from "next-intl";
import { TESTIMONIALS, type TestimonialEntry } from "@/lib/landing/testimonials";

/**
 * Marketing testimonials section.
 *
 * Renders a responsive grid (1 / 2 / 3 columns) of testimonial cards using the
 * static voice list from `@/lib/landing/testimonials`. Quotes are intentionally
 * not pulled through i18n — see the data module for the rationale.
 */
export function TestimonialsSection() {
  const t = useTranslations("landing.testimonials");

  return (
    <section
      className="relative w-full bg-[var(--neutral-2)] py-24 md:py-32"
      aria-labelledby="landing-testimonials-title"
    >
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
            {t("badge")}
          </p>
          <h2
            id="landing-testimonials-title"
            className="text-balance text-4xl font-black tracking-tight text-[var(--neutral-12)] md:text-5xl"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-[var(--neutral-11)]">{t("subtitle")}</p>
        </div>

        <ul
          data-testid="testimonials-grid"
          className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {TESTIMONIALS.map((item) => (
            <TestimonialCard key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

TestimonialsSection.displayName = "LandingTestimonialsSection";

function TestimonialCard({ item }: { item: TestimonialEntry }) {
  return (
    <li className="flex h-full flex-col rounded-2xl border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-6 shadow-sm transition-shadow hover:shadow-md md:p-8">
      <blockquote className="flex-1 text-base leading-relaxed text-[var(--neutral-12)]">
        &ldquo;{item.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          {item.initials}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--neutral-12)]">{item.name}</span>
          <span className="text-xs text-[var(--neutral-11)]">
            {item.role} · {item.company}
          </span>
        </div>
      </figcaption>
    </li>
  );
}
