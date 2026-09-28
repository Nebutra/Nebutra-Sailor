"use client";

import { ScrollVelocityContainer, ScrollVelocityRow } from "@nebutra/ui/primitives";

export function ScrollVelocityDemo() {
  return (
    <div className="py-12 md:py-24 mx-auto w-full overflow-hidden border-y bg-background font-sans">
      <div className="mb-12 px-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Scroll Velocity</h2>
        <p className="text-muted-foreground">
          Scroll down or up to change the speed and direction.
        </p>
      </div>

      <ScrollVelocityContainer className="gap-6 flex flex-col">
        <ScrollVelocityRow baseVelocity={3} direction={1}>
          <div className="gap-4 pr-4 flex">
            <span className="text-4xl md:text-6xl font-black tracking-tighter text-foreground uppercase opacity-80">
              BUILD FASTER
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter stroke-text text-transparent uppercase">
              •
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter text-foreground uppercase opacity-80">
              SHIP SAFER
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter stroke-text text-transparent uppercase">
              •
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter text-foreground uppercase opacity-80">
              SCALE HIGHER
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter stroke-text text-transparent uppercase">
              •
            </span>
          </div>
        </ScrollVelocityRow>

        <ScrollVelocityRow baseVelocity={4} direction={-1}>
          <div className="gap-4 pr-4 flex">
            <span className="text-4xl md:text-6xl font-black tracking-tighter text-primary uppercase">
              NEXTJS
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter stroke-text text-transparent uppercase">
              •
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter text-primary uppercase">
              REACT
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter stroke-text text-transparent uppercase">
              •
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter text-primary uppercase">
              TAILWIND
            </span>
            <span className="text-4xl md:text-6xl font-black tracking-tighter stroke-text text-transparent uppercase">
              •
            </span>
          </div>
        </ScrollVelocityRow>
      </ScrollVelocityContainer>

      <style jsx global>{`
        .stroke-text {
          -webkit-text-stroke: 1px hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
}
