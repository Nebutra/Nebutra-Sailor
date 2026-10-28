"use client";

/**
 * Tune a spring, see it, take it away.
 *
 * Three sliders (stiffness, damping, mass) drive one physical model. The curve,
 * the moving block and the three code snippets are all read off that model, so
 * what is drawn is what is copied: the token JSON a designer commits, the
 * `linear()` easing CSS gets, and the numbers a JS spring library takes. The
 * snippets come from `lib/motion/codegen.ts`, the same functions the token build
 * is tested against.
 *
 * The slider values are user input; they are the only free numbers in the Lab.
 */

import {
  CopyButton,
  Input,
  Label,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
} from "@nebutra/ui/primitives";
import * as React from "react";
import {
  MotionControls,
  ReducedMotionNotice,
  type Speed,
  usePrefersReducedMotion,
  useSeen,
} from "@/components/motion-kit";
import { usePlayhead } from "@/components/motion-playhead";
import { SpringCurveSvg } from "@/components/motion-spring-curve";
import { springCss, springJs, springTokenJson, toTokenName } from "@/lib/motion/codegen";
import type { SpringPreset } from "@/lib/motion/roles";
import {
  dampingRatio,
  describeFeel,
  SPRING_LIMITS,
  type SpringParams,
  springOvershoot,
  springSettleMs,
  springValue,
} from "@/lib/motion/spring";

const FORMATS = [
  { id: "token", label: "Token" },
  { id: "css", label: "CSS" },
  { id: "js", label: "JS" },
] as const;
type Format = (typeof FORMATS)[number]["id"];

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs text-muted-foreground uppercase tracking-label">{label}</span>
      <span className="font-mono text-foreground text-sm tabular-nums">{value}</span>
    </div>
  );
}

export function MotionSpringTuner({ presets }: { presets: SpringPreset[] }) {
  const start = presets.find((preset) => preset.name === "smooth") ?? presets[0];
  const [params, setParams] = React.useState<SpringParams>(
    start?.params ?? { stiffness: 170, damping: 26, mass: 1 },
  );
  const [name, setName] = React.useState("custom");
  const [format, setFormat] = React.useState<Format>("token");
  const [speed, setSpeed] = React.useState<Speed>(1);
  const [consented, setConsented] = React.useState(false);

  const reduced = usePrefersReducedMotion();
  const [stageRef, seen] = useSeen<HTMLDivElement>();
  const settleMs = springSettleMs(params);
  const head = usePlayhead(settleMs, speed);
  const canPlay = seen && (!reduced || consented);
  const { play } = head;

  // Every slider move restarts the animation, so the feel of a change is immediate.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the three params are the trigger
  React.useEffect(() => {
    if (!canPlay) return;
    play();
  }, [canPlay, play, params.stiffness, params.damping, params.mass]);

  const active = presets.find(
    (preset) =>
      preset.params.stiffness === params.stiffness &&
      preset.params.damping === params.damping &&
      preset.params.mass === params.mass,
  );

  const set = (key: keyof SpringParams) => (value: number) =>
    setParams((current) => ({ ...current, [key]: value }));

  const code = React.useMemo(() => {
    if (format === "token") return springTokenJson(name, params);
    if (format === "css") return springCss(name, params);
    return springJs(name, params);
  }, [format, name, params]);

  const value = springValue(params, head.time / 1000);
  const overshoot = springOvershoot(params);
  const tokenName = toTokenName(name);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-6">
        <ReducedMotionNotice />
        <div className="flex flex-col gap-2">
          <span className="text-2xs text-muted-foreground uppercase tracking-label">
            Start from
          </span>
          <ToggleGroup
            aria-label="Spring preset"
            onValueChange={(next) => {
              const preset = presets.find((item) => item.name === next);
              if (preset) setParams(preset.params);
            }}
            size="sm"
            type="single"
            value={active?.name ?? ""}
          >
            {presets.map((preset) => (
              <ToggleGroupItem key={preset.name} value={preset.name}>
                {preset.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-5">
          <Slider
            label="Stiffness"
            max={SPRING_LIMITS.stiffness.max}
            min={SPRING_LIMITS.stiffness.min}
            onValueChange={set("stiffness")}
            step={SPRING_LIMITS.stiffness.step}
            value={params.stiffness}
          />
          <Slider
            label="Damping"
            max={SPRING_LIMITS.damping.max}
            min={SPRING_LIMITS.damping.min}
            onValueChange={set("damping")}
            step={SPRING_LIMITS.damping.step}
            value={params.damping}
          />
          <Slider
            label="Mass"
            max={SPRING_LIMITS.mass.max}
            min={SPRING_LIMITS.mass.min}
            onValueChange={set("mass")}
            step={SPRING_LIMITS.mass.step}
            value={params.mass}
          />
        </div>
        <p className="m-0 text-neutral-11 text-sm leading-snug">{describeFeel(params)}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="rounded-[var(--radius-lg)] bg-muted/50 p-3" ref={stageRef}>
          <SpringCurveSvg
            label={`Response curve, stiffness ${params.stiffness}, damping ${params.damping}, mass ${params.mass}`}
            markerMs={head.time}
            params={params}
          />
        </div>
        <div className="relative flex h-16 items-center overflow-hidden rounded-[var(--radius-lg)] bg-muted/50 px-4">
          <div className="relative w-full">
            <div className="relative" style={{ transform: `translateX(${value * 70}%)` }}>
              <span className="block size-8 rounded-[var(--radius-md)] bg-primary" />
            </div>
            <span
              aria-hidden
              className="absolute -inset-y-3 left-[70%] border-border border-l border-dashed" // allow-physical: a time-axis marker placed by percentage from the physical left
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Readout label="Settles" value={`${settleMs} ms`} />
          <Readout label="Overshoot" value={`${(overshoot * 100).toFixed(0)}%`} />
          <Readout label="Damping ratio" value={dampingRatio(params).toFixed(2)} />
        </div>
        <MotionControls
          onReplay={() => {
            setConsented(true);
            play();
          }}
          onSpeedChange={setSpeed}
          speed={speed}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex w-full max-w-xs flex-col gap-1.5">
            <Label htmlFor="spring-token-name">Token name</Label>
            <Input
              id="spring-token-name"
              onChange={(event) => setName(event.currentTarget.value)}
              value={name}
            />
            <span className="font-mono text-2xs text-muted-foreground">
              --spring-{tokenName}-easing
            </span>
          </div>
          <ToggleGroup
            aria-label="Output format"
            onValueChange={(next) => {
              const found = FORMATS.find((item) => item.id === next);
              if (found) setFormat(found.id);
            }}
            size="sm"
            type="single"
            value={format}
          >
            {FORMATS.map((item) => (
              <ToggleGroupItem key={item.id} value={item.id}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="relative rounded-[var(--radius-lg)] bg-muted/50">
          <div className="absolute top-2 end-2">
            <CopyButton size="sm" successMessage={`Copied ${format}`} value={code} />
          </div>
          <pre className="m-0 max-h-80 overflow-auto p-4 pe-14 font-mono text-foreground text-xs leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
