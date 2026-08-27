import { ShineBorder } from "@nebutra/ui/primitives";

export function ShineBorderDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <ShineBorder
        shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
        borderRadius={16}
        borderWidth={2}
        className="max-w-sm w-full bg-background"
      >
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Shine Card</h2>
          <p className="text-sm text-muted-foreground">Animated gradient border effect</p>
        </div>
      </ShineBorder>
    </div>
  );
}
