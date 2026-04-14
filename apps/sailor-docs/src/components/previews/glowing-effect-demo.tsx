import { GlowingEffect } from "@nebutra/ui/primitives";

export function GlowingEffectDemo() {
  return (
    <div className="p-12 flex w-full items-center justify-center">
      <div className="p-8 w-64 relative rounded-xl border bg-background shadow-sm">
        <GlowingEffect
          spread={40}
          glow={false}
          disabled={false}
          proximity={64}
          inactiveZone={0.7}
        />
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <p className="font-bold">Hover Card</p>
          <p className="text-sm mt-2 text-muted-foreground">Move mouse to see glow effect</p>
        </div>
      </div>
    </div>
  );
}
