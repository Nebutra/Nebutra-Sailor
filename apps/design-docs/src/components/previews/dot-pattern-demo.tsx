import { DotPattern } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";

export function DotPatternDemo() {
  return (
    <div className="max-w-3xl p-8 relative flex h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-background">
      <h2 className="text-4xl font-bold tracking-tight z-10 text-center text-foreground/80">
        Dot Pattern <span className="mt-2 text-2xl block text-primary">Interactive Glow</span>
      </h2>
      <DotPattern
        glow
        width={24}
        height={24}
        cr={2}
        className={cn(
          "[mask-image:radial-gradient(circle_at_center,white_0%,transparent_72%)]",
          "text-primary/45 dark:text-primary/55",
        )}
      />
    </div>
  );
}
