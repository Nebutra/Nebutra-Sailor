import { AnimatedSpan, TypingAnimation } from "@nebutra/ui/primitives";
import { ActivityMatrix } from "./ActivityMatrix";
import { FauxTerminal } from "./FauxTerminal";
import { LiveMetricsChart } from "./LiveMetricsChart";

export function AnalyticsTerminal() {
  return (
    <FauxTerminal>
      <div
        key="analytics-term"
        className="font-mono text-xs md:text-sm leading-relaxed flex flex-col h-full"
      >
        <div className="flex flex-col gap-2">
          <TypingAnimation delay={100} className="text-muted-foreground/80 dark:text-zinc-400">
            &gt; nebutra telemetry --live
          </TypingAnimation>
          <AnimatedSpan delay={1500} className="text-cyan-600 dark:text-cyan-400">
            ⚡ Connecting to real-time stream...
          </AnimatedSpan>
          <AnimatedSpan delay={2200} className="text-emerald-600 dark:text-emerald-400 font-medium">
            ✔ [200 OK] Connected. Ingesting telemetry.
          </AnimatedSpan>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <AnimatedSpan delay={2800} className="w-full">
            <LiveMetricsChart />
          </AnimatedSpan>

          <AnimatedSpan delay={3500}>
            <ActivityMatrix />
          </AnimatedSpan>
        </div>
      </div>
    </FauxTerminal>
  );
}
