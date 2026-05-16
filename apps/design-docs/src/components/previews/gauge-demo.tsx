import { Gauge } from "@nebutra/ui/primitives";

export function GaugeDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center justify-center gap-2 px-4 py-8">
      <p id="gauge-demo-label" className="text-sm text-muted-foreground">
        Build Cache Hit Rate · 72%
      </p>
      <Gauge aria-labelledby="gauge-demo-label" value={72} size="medium" showValue />
    </div>
  );
}
