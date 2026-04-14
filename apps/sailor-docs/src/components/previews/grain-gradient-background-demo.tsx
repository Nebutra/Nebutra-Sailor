import { GrainGradientBackground } from "@nebutra/ui/primitives";

export function GrainGradientBackgroundDemo() {
  return (
    <div className="gap-8 max-w-4xl p-4 mx-auto flex min-h-[500px] w-full flex-col items-center justify-center">
      <div className="relative flex h-[400px] w-full items-center justify-center overflow-hidden rounded-2xl border shadow-lg">
        <GrainGradientBackground
          colors={["#a855f7", "#ec4899", "#f59e0b", "#3b82f6"]}
          softness={0.8}
          noise={0.15}
          speed={0.3}
          className="opacity-80"
        />

        <div className="backdrop-blur-md p-8 max-w-md border-white/20 relative z-10 rounded-2xl border bg-background/50 text-center shadow-xl">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Dreamy Gradients</h2>
          <p className="mb-6 text-foreground/80">
            A beautiful, animated grain gradient background powered by WebGL shaders. Perfect for
            hero sections and distinctive landing pages.
          </p>
          <button
            type="button"
            className="px-6 py-2 font-medium rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Get Started Focus
          </button>
        </div>
      </div>
    </div>
  );
}
