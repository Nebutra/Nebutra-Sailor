"use client";

/**
 * What happens to an animation when you click again halfway through it.
 *
 * Real interfaces are interrupted constantly: a toggle clicked twice, a menu
 * closed while it is still opening. The animation has to decide what the block
 * does *now*. Three answers, same spring, same clicks:
 *
 *   Restart   jump back to the start of the new leg and run it from the top
 *   Retarget  start the new leg from where the block is, but with no memory of
 *             how fast it was going (a fresh WAAPI animation)
 *   Spring    keep position and velocity, change only the goal (`lib/motion/sim.ts`)
 *
 * Each lane traces its position against time. Restart draws a cliff, Retarget a
 * kink, Spring a smooth bend. Under reduced motion the lanes snap instead.
 */

import { Button, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import * as React from "react";
import { pickOne, type Speed, SpeedToggle, usePrefersReducedMotion } from "@/components/motion-kit";
import type { SpringPreset } from "@/lib/motion/roles";
import { advanceSpring, isAtRest, type SpringState } from "@/lib/motion/sim";
import { type SpringParams, springSettleMs, springToLinear } from "@/lib/motion/spring";

/** How much history a trace shows. Presentation only, not a motion value. */
const WINDOW_MS = 2000;

/** Plot box in SVG units, and the value range it shows (room for overshoot). */
const PLOT = { width: 320, height: 96, padding: 8, min: -0.1, max: 1.35 } as const;

type LaneId = "restart" | "retarget" | "spring";

const LANES: { id: LaneId; title: string; caption: string }[] = [
  {
    id: "restart",
    title: "Restart",
    caption: "Jumps to the start of the new leg and runs it again. The block teleports.",
  },
  {
    id: "retarget",
    title: "Retarget",
    caption: "Starts the new leg from where it is, with its speed forgotten. A kink in the curve.",
  },
  {
    id: "spring",
    title: "Spring",
    caption: "Keeps position and velocity; only the goal changes. The curve bends and carries on.",
  },
];

interface Sample {
  t: number;
  x: number;
}

const translate = (fraction: number) => `translateX(${fraction * 100}%)`;

/** Where a WAAPI-driven block is right now, as a fraction of its travel. */
function readX(el: HTMLElement): number {
  if (el.offsetWidth === 0) return 0;
  return new DOMMatrixReadOnly(getComputedStyle(el).transform).m41 / el.offsetWidth;
}

function tracePath(samples: Sample[], now: number): string {
  const x = (t: number) =>
    PLOT.padding + ((t - (now - WINDOW_MS)) / WINDOW_MS) * (PLOT.width - PLOT.padding * 2);
  const y = (v: number) =>
    PLOT.height -
    PLOT.padding -
    ((v - PLOT.min) / (PLOT.max - PLOT.min)) * (PLOT.height - PLOT.padding * 2);
  return samples
    .map((s, i) => `${i === 0 ? "M" : "L"}${x(s.t).toFixed(1)},${y(s.x).toFixed(1)}`)
    .join(" ");
}

function Trace({ samples, clicks, now }: { samples: Sample[]; clicks: number[]; now: number }) {
  const lineY = (v: number) =>
    PLOT.height -
    PLOT.padding -
    ((v - PLOT.min) / (PLOT.max - PLOT.min)) * (PLOT.height - PLOT.padding * 2);
  const clickX = (t: number) =>
    PLOT.padding + ((t - (now - WINDOW_MS)) / WINDOW_MS) * (PLOT.width - PLOT.padding * 2);
  return (
    <svg
      aria-label="Position over time"
      className="block h-auto w-full"
      role="img"
      viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
    >
      <title>Position over time</title>
      {[0, 1].map((v) => (
        <line
          className="stroke-border"
          key={v}
          x1={PLOT.padding}
          x2={PLOT.width - PLOT.padding}
          y1={lineY(v)}
          y2={lineY(v)}
        />
      ))}
      {clicks
        .filter((t) => t > now - WINDOW_MS)
        .map((t) => (
          <line
            className="stroke-muted-foreground"
            key={t}
            strokeDasharray="2 3"
            x1={clickX(t)}
            x2={clickX(t)}
            y1={PLOT.padding}
            y2={PLOT.height - PLOT.padding}
          />
        ))}
      <path
        className="stroke-primary"
        d={tracePath(samples, now)}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

export function MotionInterruptTest({ presets }: { presets: SpringPreset[] }) {
  const [presetName, setPresetName] = React.useState(
    presets.find((preset) => preset.name === "smooth")?.name ?? presets[0]?.name ?? "",
  );
  const [speed, setSpeed] = React.useState<Speed>(1);
  const reduced = usePrefersReducedMotion();
  const params: SpringParams = presets.find((preset) => preset.name === presetName)?.params ?? {
    stiffness: 170,
    damping: 26,
    mass: 1,
  };

  // The frame loop reads the latest settings through refs, so it never goes stale.
  const live = React.useRef({ params, speed, reduced });
  live.current = { params, speed, reduced };

  const movers = React.useRef<Record<LaneId, HTMLDivElement | null>>({
    restart: null,
    retarget: null,
    spring: null,
  });
  const animations = React.useRef<Record<"restart" | "retarget", Animation | null>>({
    restart: null,
    retarget: null,
  });
  const target = React.useRef<0 | 1>(0);
  const sim = React.useRef<SpringState>({ position: 0, velocity: 0 });
  const samples = React.useRef<Record<LaneId, Sample[]>>({ restart: [], retarget: [], spring: [] });
  const clicks = React.useRef<number[]>([]);
  const raf = React.useRef(0);
  const last = React.useRef(0);
  const [now, setNow] = React.useState(0);

  const frame = React.useRef<(time: number) => void>(() => undefined);
  frame.current = (time: number) => {
    const { params: p, speed: s } = live.current;
    const dt = Math.max(0, (time - last.current) / 1000);
    last.current = time;

    // Springs work in percent of travel so the rest threshold is a small distance.
    const goal = target.current * 100;
    sim.current = advanceSpring(sim.current, goal, p, dt * s);
    if (isAtRest(sim.current, goal)) sim.current = { position: goal, velocity: 0 };

    const restart = movers.current.restart;
    const retarget = movers.current.retarget;
    const readings: Record<LaneId, number> = {
      restart: restart ? readX(restart) : 0,
      retarget: retarget ? readX(retarget) : 0,
      spring: sim.current.position / 100,
    };
    for (const lane of LANES) {
      const list = samples.current[lane.id];
      list.push({ t: time, x: readings[lane.id] });
      while (list.length > 0 && (list[0]?.t ?? time) < time - WINDOW_MS) list.shift();
    }
    setNow(time);

    const flying =
      animations.current.restart?.playState === "running" ||
      animations.current.retarget?.playState === "running" ||
      !isAtRest(sim.current, goal);
    const lastClick = clicks.current[clicks.current.length - 1] ?? 0;
    if (flying || time - lastClick < WINDOW_MS) {
      raf.current = requestAnimationFrame((t) => frame.current(t));
    } else {
      raf.current = 0;
    }
  };

  const startLoop = () => {
    if (raf.current) return;
    last.current = performance.now();
    raf.current = requestAnimationFrame((t) => frame.current(t));
  };

  React.useEffect(() => {
    const running = animations.current;
    return () => {
      cancelAnimationFrame(raf.current);
      running.restart?.cancel();
      running.retarget?.cancel();
    };
  }, []);

  const move = () => {
    const { params: p, speed: s, reduced: snap } = live.current;
    const to = target.current === 1 ? 0 : 1;
    target.current = to;
    clicks.current.push(performance.now());
    clicks.current = clicks.current.filter((t) => t > performance.now() - WINDOW_MS);

    const restart = movers.current.restart;
    const retarget = movers.current.retarget;
    if (snap) {
      for (const lane of ["restart", "retarget"] as const) {
        animations.current[lane]?.cancel();
        animations.current[lane] = null;
        const el = movers.current[lane];
        if (el) el.style.transform = translate(to);
      }
      sim.current = { position: to * 100, velocity: 0 };
    } else {
      const timing: KeyframeAnimationOptions = {
        duration: springSettleMs(p),
        easing: springToLinear(p),
        fill: "forwards",
      };
      if (restart) {
        animations.current.restart?.cancel();
        const run = restart.animate(
          [{ transform: translate(1 - to) }, { transform: translate(to) }],
          timing,
        );
        run.playbackRate = s;
        animations.current.restart = run;
      }
      if (retarget) {
        const from = readX(retarget);
        animations.current.retarget?.cancel();
        const run = retarget.animate(
          [{ transform: translate(from) }, { transform: translate(to) }],
          timing,
        );
        run.playbackRate = s;
        animations.current.retarget = run;
      }
      // The spring lane needs nothing here: the loop reads the new goal.
    }
    startLoop();
  };

  return (
    <div className="flex flex-col gap-6">
      {reduced ? (
        <p className="m-0 rounded-[var(--radius-md)] bg-muted px-3 py-2 text-muted-foreground text-xs">
          Your system asks for reduced motion, so every lane snaps to the goal. The traces show a
          step instead of a curve.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={move} type="button">
          Move — click it again mid-flight
        </Button>
        <ToggleGroup
          aria-label="Spring preset"
          onValueChange={(next) => setPresetName((current) => pickOne(next) ?? current)}
          size="sm"
          type="single"
          value={presetName}
        >
          {presets.map((preset) => (
            <ToggleGroupItem key={preset.name} value={preset.name}>
              {preset.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <SpeedToggle onSpeedChange={setSpeed} speed={speed} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {LANES.map((lane) => (
          <div className="flex min-w-0 flex-col gap-3" key={lane.id}>
            <div className="flex flex-col gap-0.5">
              <span className="text-2xs text-muted-foreground uppercase tracking-label">
                {lane.title}
              </span>
              <span className="text-neutral-11 text-xs leading-snug">{lane.caption}</span>
            </div>
            <div className="flex h-14 items-center rounded-[var(--radius-lg)] bg-muted/50 px-4">
              <div className="w-full">
                <div
                  className="w-[calc(100%-2rem)]"
                  ref={(el) => {
                    movers.current[lane.id] = el;
                  }}
                  style={{
                    transform: translate(lane.id === "spring" ? sim.current.position / 100 : 0),
                  }}
                >
                  <span className="block size-8 rounded-[var(--radius-md)] bg-primary" />
                </div>
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] bg-muted/50 p-2">
              <Trace clicks={clicks.current} now={now} samples={samples.current[lane.id]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
