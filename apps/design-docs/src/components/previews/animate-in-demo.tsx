"use client";

import { AnimateIn, AnimateInGroup } from "@nebutra/ui/primitives";

const items = [
  { title: "Emerge", copy: "Default Nebutra materialize-in entrance." },
  { title: "Fade up", copy: "List and card hierarchy with restrained lift." },
  { title: "Flow", copy: "Horizontal streaming motion for agent surfaces." },
] as const;

export function AnimateInDemo() {
  return (
    <div className="w-full max-w-3xl rounded-[var(--radius-lg)] border bg-card p-5 text-card-foreground">
      <AnimateInGroup className="grid gap-3 md:grid-cols-3" stagger="normal">
        {items.map((item, index) => (
          <AnimateIn key={item.title} delay={index * 0.08} preset={index === 2 ? "flow" : "fadeUp"}>
            <section className="h-full rounded-[var(--radius-md)] border bg-background p-4">
              <h3 className="font-medium text-sm">{item.title}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-5">{item.copy}</p>
            </section>
          </AnimateIn>
        ))}
      </AnimateInGroup>
    </div>
  );
}
