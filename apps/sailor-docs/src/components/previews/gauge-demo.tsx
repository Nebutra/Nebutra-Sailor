import { Gauge } from "@nebutra/ui/primitives";

export function GaugeDemo() {
  return (
    <div className="max-w-sm px-4 py-8 space-x-4 flex w-full items-center justify-center">
      <Gauge value={72} size={64} label />
    </div>
  );
}
