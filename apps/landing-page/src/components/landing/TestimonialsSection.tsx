"use client";

import { useTranslations } from "next-intl";
import { AnimateIn } from "./AnimateIn";

import { UniqueTestimonial } from "./testimonials/UniqueTestimonial";

export function TestimonialsSection() {
  const t = useTranslations("microLanding.testimonials");

  const TESTIMONIALS = [
    {
      id: 1,
      quote: t("t1.quote"),
      author: t("t1.author"),
      role: t("t1.role"),
      seed: "sarah-chen",
    },
    {
      id: 2,
      quote: t("t2.quote"),
      author: t("t2.author"),
      role: t("t2.role"),
      seed: "marcus-dev",
    },
    {
      id: 3,
      quote: t("t3.quote"),
      author: t("t3.author"),
      role: t("t3.role"),
      seed: "emma-founder",
    },
  ];

  return (
    <section className="w-full bg-muted/20 py-24 md:py-32 overflow-hidden border-t border-border/50">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <AnimateIn inView preset="emerge" className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold tracking-[0.2em] text-primary uppercase">
            {t("badge")}
          </p>
          <h2 className="text-4xl font-black tracking-tight text-foreground md:text-5xl text-balance">
            {t("title")}
          </h2>
        </AnimateIn>

        <section className="mt-12 bg-background/50 backdrop-blur-xl border border-border/50 rounded-3xl mx-auto max-w-5xl shadow-2xl p-4 md:p-8">
          <UniqueTestimonial testimonials={TESTIMONIALS} />
        </section>
      </div>
    </section>
  );
}

TestimonialsSection.displayName = "TestimonialsSection";
