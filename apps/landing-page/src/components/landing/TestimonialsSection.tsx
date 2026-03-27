"use client";

import { DiceBearAvatar } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { DeploymentStats } from "./DeploymentStats";

interface TestimonialsSectionProps {
  stars?: number;
}

export function TestimonialsSection({ stars }: TestimonialsSectionProps) {
  const t = useTranslations("microLanding.testimonials");

  const TESTIMONIALS = [
    {
      quote: t("t1.quote"),
      author: t("t1.author"),
      role: t("t1.role"),
      seed: "sarah-chen",
    },
    {
      quote: t("t2.quote"),
      author: t("t2.author"),
      role: t("t2.role"),
      seed: "marcus-dev",
    },
    {
      quote: t("t3.quote"),
      author: t("t3.author"),
      role: t("t3.role"),
      seed: "emma-founder",
    },
  ] as const;

  return (
    <section className="w-full bg-muted/20 py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <AnimateIn inView preset="emerge" className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold tracking-[0.2em] text-primary uppercase">
            {t("badge")}
          </p>
          <h2 className="text-4xl font-black tracking-tight text-foreground md:text-5xl text-balance">
            {t("title")}
          </h2>
        </AnimateIn>

        <AnimateInGroup inView stagger="normal" className="mt-16 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <AnimateIn key={item.author} preset="fadeUp">
              <article className="group flex h-full flex-col rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl p-8 transition-all hover:bg-muted/40 hover:border-primary/20 shadow-xl shadow-primary/5">
                <p className="flex-1 text-base leading-relaxed text-muted-foreground italic mb-8">
                  &quot;{item.quote}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <DiceBearAvatar
                    seed={item.seed}
                    avatarStyle="notionists-neutral"
                    size="sm"
                    className="border border-border/50 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-bold text-foreground truncate">{item.author}</p>
                    <p className="text-sm text-muted-foreground/80 truncate">{item.role}</p>
                  </div>
                </div>
              </article>
            </AnimateIn>
          ))}
        </AnimateInGroup>

        <DeploymentStats stars={stars} />
      </div>
    </section>
  );
}

TestimonialsSection.displayName = "TestimonialsSection";
