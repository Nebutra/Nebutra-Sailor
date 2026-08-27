"use client";

/**
 * Each duration rail on the thing it actually governs.
 *
 * A bar sliding across a track shows that one number is bigger than another,
 * which the table above already says in digits. What it cannot show is the only
 * question worth asking of a duration token: does this feel right *for the job
 * it is named after*. 100ms is correct for a button press and absurd for a hero
 * entrance, and no amount of animating a rectangle communicates that.
 *
 * The tokens name their own carriers — the source descriptions read "hover,
 * focus, toggle, button press", "modal open, dropdown reveal, tab switch",
 * "slide-in, expand, accordion, drawer", "landing reveal". So each one is
 * demonstrated on one of those, using the real component, driven by the real
 * token. They run on one clock so the four can be compared in a single pass,
 * and the pass repeats because a motion demo you cannot re-watch is a motion
 * demo you have to catch.
 */

import { ChevronDown } from "@nebutra/icons";
import { Badge, Button, StatusDot } from "@nebutra/ui/primitives";
import * as React from "react";

/** One pass, then a beat before the next. Long enough that the 500ms carrier
 *  finishes and is legible at rest before everything resets. */
const CYCLE_MS = 2600;

/** When each carrier flips inside the cycle — all together, as the rails do. */
const START_MS = 400;

function useCycle(): boolean {
  const [on, setOn] = React.useState(false);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setOn(false);
      window.setTimeout(() => !cancelled && setOn(true), START_MS);
    };
    tick();
    const id = window.setInterval(tick, CYCLE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return on;
}

function Carrier({
  token,
  value,
  job,
  children,
}: {
  token: string;
  value: string;
  job: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-card p-5 shadow-ambient-sm">
      <div className="flex items-baseline justify-between gap-3">
        <code className="font-mono text-[12px] text-foreground">--{token}</code>
        <code className="font-mono text-[12px] text-muted-foreground tabular-nums">{value}</code>
      </div>
      <div className="flex min-h-[104px] items-center justify-center overflow-hidden">
        {children}
      </div>
      <p className="text-[12px] text-muted-foreground leading-snug">{job}</p>
    </div>
  );
}

export function DurationCarriers() {
  const on = useCycle();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {/* micro — the press. The only duration a finger can out-run: at 100ms the
          state has changed before you have finished pressing. */}
      <Carrier
        job="Micro-feedback: hover, focus, toggle, button press"
        token="duration-micro"
        value="100ms"
      >
        <Button
          className="transition-[transform,background-color,box-shadow] ease-out"
          size="sm"
          style={{
            transitionDuration: "var(--duration-micro)",
            transform: on ? "translateY(1px) scale(0.97)" : "none",
          }}
        >
          Deploy
        </Button>
      </Carrier>

      {/* flow — the switch. Long enough to be followed, short enough that it is
          not an event. */}
      <Carrier
        job="State flow: modal open, dropdown reveal, tab switch"
        token="duration-flow"
        value="200ms"
      >
        <div className="relative w-full max-w-[180px]">
          <div className="flex rounded-[var(--radius-md)] bg-muted p-1 text-[12px]">
            <span className="relative z-10 flex-1 py-1 text-center text-foreground">Overview</span>
            <span className="relative z-10 flex-1 py-1 text-center text-muted-foreground">
              Logs
            </span>
            <span
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-[var(--radius-sm)] bg-card shadow-ambient-sm transition-transform ease-out"
              style={{
                transitionDuration: "var(--duration-flow)",
                transform: on ? "translateX(100%)" : "translateX(0)",
              }}
            />
          </div>
        </div>
      </Carrier>

      {/* reveal — the expand. The one duration where the eye is tracking a
          moving edge rather than a state change. */}
      <Carrier
        job="Content unveil: slide-in, expand, accordion, drawer"
        token="duration-reveal"
        value="300ms"
      >
        <div className="w-full max-w-[200px] overflow-hidden rounded-[var(--radius-md)] bg-muted/60">
          <div className="flex items-center justify-between px-3 py-2 text-[12px] text-foreground">
            Build settings
            <ChevronDown
              className="size-3.5 transition-transform ease-out"
              style={{
                transitionDuration: "var(--duration-reveal)",
                transform: on ? "rotate(180deg)" : "none",
              }}
            />
          </div>
          <div
            className="grid transition-[grid-template-rows] ease-out"
            style={{
              transitionDuration: "var(--duration-reveal)",
              gridTemplateRows: on ? "1fr" : "0fr",
            }}
          >
            <div className="overflow-hidden">
              <div className="px-3 pb-2 text-[11px] text-muted-foreground">
                Framework preset, root directory, install command.
              </div>
            </div>
          </div>
        </div>
      </Carrier>

      {/* cinematic — the entrance. At 500ms this is the only one that reads as a
          moment rather than a response; used on a button it would feel broken. */}
      <Carrier
        job="Hero-grade entrance: landing reveal, large delight moments"
        token="duration-cinematic"
        value="500ms"
      >
        <div
          className="flex w-full max-w-[200px] flex-col gap-2 rounded-[var(--radius-md)] bg-muted/60 p-3 transition-[opacity,transform,filter] ease-out"
          style={{
            transitionDuration: "var(--duration-cinematic)",
            opacity: on ? 1 : 0,
            transform: on ? "none" : "translateY(12px)",
            filter: on ? "none" : "blur(6px)",
          }}
        >
          <div className="flex items-center gap-2">
            <StatusDot label state="READY" />
            <Badge variant="success">live</Badge>
          </div>
          <span className="text-[12px] text-foreground">sailor-web deployed</span>
        </div>
      </Carrier>
    </div>
  );
}
