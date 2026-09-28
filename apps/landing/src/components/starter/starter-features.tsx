import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { SITE } from "@/content/site";
import { SectionHeading } from "./section-heading";
import { say } from "./starter-copy";
import { StarterIcon } from "./starter-icon";

export function StarterFeatures({ locale }: { locale: string }) {
  const { features } = SITE;
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-20 px-4 py-20 md:px-6 md:py-28"
    >
      <div className="mx-auto max-w-content">
        <SectionHeading
          id="features-title"
          eyebrow={say(features.eyebrow, locale)}
          title={say(features.title, locale)}
          lead={say(features.lead, locale)}
        />
        <AnimateInGroup
          stagger="fast"
          className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-xl)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.items.map((item) => (
            <AnimateIn key={item.icon} preset="fadeUp" className="bg-card p-6 md:p-8">
              <span className="grid size-9 place-items-center rounded-[var(--radius-md)] border border-border bg-background text-foreground">
                <StarterIcon name={item.icon} />
              </span>
              <h3 className="mt-5 font-medium text-foreground">{say(item.title, locale)}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {say(item.body, locale)}
              </p>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}
