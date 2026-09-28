import { Plus } from "@nebutra/icons";
import { SITE } from "@/content/site";
import { SectionHeading } from "./section-heading";
import { say } from "./starter-copy";

/** The questions from src/content/site.ts, as native disclosures (no script needed). */
export function StarterFaq({ locale, level = 2 }: { locale: string; level?: 1 | 2 }) {
  const { faq } = SITE;
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-20 px-4 py-20 md:px-6 md:py-28"
    >
      <div className="mx-auto grid max-w-content gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <SectionHeading
          id="faq-title"
          level={level}
          align="start"
          eyebrow={say(faq.eyebrow, locale)}
          title={say(faq.title, locale)}
          lead={say(faq.lead, locale)}
        />
        <div className="divide-y divide-border border-y border-border">
          {faq.items.map((item) => (
            <details key={item.q.en} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-medium text-foreground [&::-webkit-details-marker]:hidden">
                {say(item.q, locale)}
                <Plus
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground transition-transform duration-micro group-open:rotate-45"
                />
              </summary>
              <p className="pb-5 text-pretty text-sm leading-relaxed text-muted-foreground">
                {say(item.a, locale)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
