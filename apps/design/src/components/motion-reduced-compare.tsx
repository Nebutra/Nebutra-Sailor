"use client";

/**
 * One screen, two ways: full motion beside reduced motion.
 *
 * A reduced-motion policy is easy to state and easy to get wrong in a way no
 * one notices, because the people it is for are the people who never see the
 * other column. So both play together from the same trigger: a panel enters, its
 * rows follow one stagger step apart, a status swaps, a button is pressed. In the
 * right column movement is gone and opacity stays, so every change still reads as
 * a change. Both columns are built from the role frames (`lib/motion/role-frames.ts`),
 * so what you see is the token policy, not a second hand-tuned animation.
 */

import { Badge, Button } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  MotionControls,
  ReducedMotionNotice,
  type Speed,
  slowFactor,
  slowStyle,
  usePlayback,
  usePrefersReducedMotion,
  useSeen,
} from "@/components/motion-kit";
import { parseMs, type RoleFrameId, roleFrames, roleTransition } from "@/lib/motion/role-frames";

const ROWS = ["Invite sent", "Role assigned", "Access granted"];

/** A role's frame, as an inline style: pose, transition, and an optional stagger step. */
function pose(
  id: RoleFrameId,
  reduced: boolean,
  on: boolean,
  options: { step?: number; side?: "subject" | "partner" } = {},
): React.CSSProperties {
  const frames = roleFrames(id, reduced);
  const frame = options.side === "partner" ? (frames.partner ?? frames.subject) : frames.subject;
  return {
    ...(on ? frame.active : frame.rest),
    transition: roleTransition(id, frames.property),
    transitionDelay: `calc(var(--stagger-normal) * ${options.step ?? 0} * var(--slow))`,
  };
}

function Scene({
  reduced,
  on,
  pressed,
  title,
  caption,
}: {
  reduced: boolean;
  on: boolean;
  pressed: boolean;
  title: string;
  caption: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-2xs text-muted-foreground uppercase tracking-label">{title}</span>
        <span className="text-neutral-11 text-xs">{caption}</span>
      </div>
      <div className="flex min-h-72 flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] bg-muted/50 p-4">
        <div className="flex items-center justify-between gap-3" style={pose("enter", reduced, on)}>
          <span className="text-foreground text-sm">Team access</span>
          <span className="relative inline-flex">
            <span style={pose("swap", reduced, on)}>
              <Badge variant="outline">Pending</Badge>
            </span>
            <span
              className="absolute inset-0"
              style={pose("swap", reduced, on, { side: "partner" })}
            >
              <Badge>Active</Badge>
            </span>
          </span>
        </div>
        {ROWS.map((row, index) => (
          <div
            className="flex h-9 items-center rounded-[var(--radius-md)] border border-border bg-background px-3 text-foreground text-sm"
            key={row}
            style={pose("enter", reduced, on, { step: index + 1 })}
          >
            {row}
          </div>
        ))}
        <div className="mt-auto flex justify-end">
          <span style={pose("press", reduced, pressed)}>
            <Button size="sm" tabIndex={-1} type="button">
              Confirm
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

export function MotionReducedCompare({ pressDuration }: { pressDuration: string }) {
  const [speed, setSpeed] = React.useState<Speed>(1);
  const [nonce, setNonce] = React.useState(0);
  const osReduced = usePrefersReducedMotion();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const on = usePlayback(nonce, seen && (!osReduced || nonce > 0));

  // Press is a gesture: it lands, is held for a beat, and lets go.
  const [pressed, setPressed] = React.useState(false);
  const holdMs = parseMs(pressDuration) * slowFactor(speed) + 450;
  React.useEffect(() => {
    setPressed(on);
    if (!on) return;
    const id = window.setTimeout(() => setPressed(false), holdMs);
    return () => window.clearTimeout(id);
  }, [on, holdMs]);

  return (
    <div className="flex flex-col gap-5" ref={ref} style={slowStyle(speed)}>
      <ReducedMotionNotice />
      <MotionControls
        onReplay={() => setNonce((n) => n + 1)}
        onSpeedChange={setSpeed}
        speed={speed}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Scene
          caption="Opacity and movement, on the role tokens."
          on={on}
          pressed={pressed}
          reduced={false}
          title="Full motion"
        />
        <Scene
          caption="Opacity only. Nothing travels, nothing scales."
          on={on}
          pressed={pressed}
          reduced
          title="Reduced motion"
        />
      </div>
    </div>
  );
}
