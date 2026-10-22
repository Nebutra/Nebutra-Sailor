"use client";

/**
 * Stagger, on a timeline you can scrub.
 *
 * Six rows enter one stagger step apart, each on the same spring. The left
 * column is the interface; the right column is the same moment drawn as a Gantt
 * chart, one bar per row, so you can see that "stagger" is nothing more than a
 * start delay. Both are pure functions of the playhead (`lib/motion/timeline.ts`),
 * which is why dragging the scrubber works without replaying anything.
 *
 * Below, the AnimateInGroup that ships in `@nebutra/ui` runs for real, so the
 * rhythm on the timeline can be compared with the rhythm in production.
 */

import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Slider, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  MotionControls,
  pickOne,
  ReducedMotionNotice,
  type Speed,
  usePrefersReducedMotion,
  useSeen,
} from "@/components/motion-kit";
import { usePlayhead } from "@/components/motion-playhead";
import type { ScaleStep, SpringPreset } from "@/lib/motion/roles";
import { springSettleMs } from "@/lib/motion/spring";
import { itemOffset, itemOpacity, staggerDelays, timelineDurationMs } from "@/lib/motion/timeline";

const ROWS = ["Overview", "Usage", "Billing", "Members", "Audit log", "Settings", "Webhooks"];
const COUNT_LIMITS = { min: 3, max: ROWS.length, step: 1 } as const;

export function MotionOrchestration({
  presets,
  staggers,
  distance,
}: {
  presets: SpringPreset[];
  staggers: ScaleStep[];
  /** The travel each row makes while entering: the largest step of the distance scale. */
  distance: ScaleStep;
}) {
  const [stepName, setStepName] = React.useState(
    staggers.find((step) => step.name === "normal")?.name ?? staggers[0]?.name ?? "",
  );
  const [presetName, setPresetName] = React.useState(
    presets.find((preset) => preset.name === "smooth")?.name ?? presets[0]?.name ?? "",
  );
  const [count, setCount] = React.useState(6);
  const [speed, setSpeed] = React.useState<Speed>(1);
  const [consented, setConsented] = React.useState(false);
  const [reference, setReference] = React.useState(0);

  const reduced = usePrefersReducedMotion();
  const mounted = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [stageRef, seen] = useSeen<HTMLDivElement>();

  const step = staggers.find((item) => item.name === stepName);
  const preset = presets.find((item) => item.name === presetName);
  const gap = step?.amount ?? 0;
  const spring = preset?.params ?? { stiffness: 170, damping: 26, mass: 1 };
  const settleMs = springSettleMs(spring);
  const delays = staggerDelays(count, gap);
  const totalMs = Math.round(timelineDurationMs(count, gap, settleMs));

  const head = usePlayhead(totalMs, speed);
  const { play } = head;
  const canPlay = seen && (!reduced || consented);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new configuration replays
  React.useEffect(() => {
    if (canPlay) play();
  }, [canPlay, play, stepName, presetName, count]);

  const replay = () => {
    setConsented(true);
    play();
    setReference((n) => n + 1);
  };

  return (
    <div className="flex flex-col gap-8">
      <ReducedMotionNotice />
      <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
        <div className="flex flex-col gap-2">
          <span className="text-2xs text-muted-foreground uppercase tracking-label">Stagger</span>
          <ToggleGroup
            aria-label="Stagger step"
            onValueChange={(next) => setStepName((current) => pickOne(next) ?? current)}
            size="sm"
            type="single"
            value={stepName}
          >
            {staggers.map((item) => (
              <ToggleGroupItem key={item.name} value={item.name}>
                {item.name} · {item.value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-2xs text-muted-foreground uppercase tracking-label">Spring</span>
          <ToggleGroup
            aria-label="Spring preset"
            onValueChange={(next) => setPresetName((current) => pickOne(next) ?? current)}
            size="sm"
            type="single"
            value={presetName}
          >
            {presets.map((item) => (
              <ToggleGroupItem key={item.name} value={item.name}>
                {item.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Slider
          label="Rows"
          wrapperClassName="min-w-56 flex-1"
          max={COUNT_LIMITS.max}
          min={COUNT_LIMITS.min}
          onValueChange={setCount}
          step={COUNT_LIMITS.step}
          value={count}
        />
      </div>

      <div className="grid grid-cols-5 gap-4" ref={stageRef}>
        <div className="col-span-2 flex min-w-0 flex-col gap-2">
          <span className="text-2xs text-muted-foreground uppercase tracking-label">Interface</span>
          {delays.map((delay, index) => (
            <div
              className="flex h-9 items-center rounded-[var(--radius-md)] border border-border bg-background px-3 text-foreground text-sm"
              key={ROWS[index]}
              style={{
                opacity: itemOpacity(head.time, delay, spring),
                transform: `translateY(${itemOffset(head.time, delay, spring, distance.amount)}px)`,
              }}
            >
              <span className="truncate">{ROWS[index]}</span>
            </div>
          ))}
        </div>
        <div className="col-span-3 flex min-w-0 flex-col gap-2">
          <span className="text-2xs text-muted-foreground uppercase tracking-label">
            Timeline · {totalMs} ms
          </span>
          <div className="relative flex flex-col gap-2">
            {delays.map((delay, index) => (
              <div
                className="relative h-9 rounded-[var(--radius-md)] bg-muted/50"
                key={ROWS[index]}
              >
                <div
                  className="absolute inset-y-2 overflow-hidden rounded-full bg-muted"
                  style={{
                    left: `${(delay / totalMs) * 100}%`,
                    width: `${(settleMs / totalMs) * 100}%`,
                  }}
                >
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${itemOpacity(head.time, delay, spring) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <span
              aria-hidden
              className="absolute inset-y-0 w-px bg-foreground"
              style={{ left: `${(head.time / totalMs) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Slider
          aria-label="Playhead"
          formatValue={(value) => `${value} ms`}
          label="Playhead — drag to scrub"
          max={totalMs}
          min={0}
          onValueChange={(value: number) => head.seek(value)}
          step={1}
          value={Math.round(head.time)}
        />
        <MotionControls onReplay={replay} onSpeedChange={setSpeed} speed={speed} />
      </div>

      <div className="flex flex-col gap-3 border-border border-t pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-2xs text-muted-foreground uppercase tracking-label">
            In production · AnimateInGroup stagger="normal"
          </span>
          <span className="text-muted-foreground text-xs">Replays with the button above</span>
        </div>
        {/* Client-only: AnimateIn's server markup (translateY) differs from its client markup
            under reduced motion, which React reports as a hydration mismatch. */}
        <div className="min-h-44">
          {mounted ? (
            <AnimateInGroup key={reference} stagger="normal">
              {ROWS.slice(0, 4).map((row) => (
                <AnimateIn key={row} preset="fadeUp">
                  <div className="mb-2 flex h-9 items-center rounded-[var(--radius-md)] border border-border bg-background px-3 text-foreground text-sm">
                    {row}
                  </div>
                </AnimateIn>
              ))}
            </AnimateInGroup>
          ) : null}
        </div>
      </div>
    </div>
  );
}
