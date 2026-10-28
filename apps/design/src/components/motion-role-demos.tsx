"use client";

/**
 * The five motion roles, each played on the thing it is for.
 *
 * A role is a bundle (duration, easing, distance) that answers "what kind of
 * change is this?" — appears, leaves, replaces, travels, responds — so it is
 * shown as that change happening, twice: with full motion, and with reduced
 * motion beside it, because the second column is the contract for anyone who
 * asked for less. Every number on screen is a `var()` onto the role's tokens
 * (see `lib/motion/role-frames.ts`).
 */

import { Badge, Button } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  MotionControls,
  ReducedMotionNotice,
  type Speed,
  Stage,
  slowFactor,
  slowStyle,
  usePlayback,
  usePrefersReducedMotion,
  useSeen,
} from "@/components/motion-kit";
import { parseMs, roleFrames, roleTransition } from "@/lib/motion/role-frames";
import type { RoleSpec, TokenFact } from "@/lib/motion/roles";

/** One of two equal slots separated by the role's distance token. */
const SLOT_WIDTH = "calc((100% - var(--motion-shared-distance)) / 2)";

/** Short form of a resolved value: a long linear() list collapses to its stop count. */
function show(fact: TokenFact): string {
  if (fact.value.startsWith("linear(")) {
    return `linear() · ${fact.value.split(",").length} stops`;
  }
  return fact.value;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[var(--radius-sm)] bg-muted px-1.5 py-0.5 font-mono text-2xs text-foreground tabular-nums">
      {children}
    </code>
  );
}

function RoleStage({
  role,
  reduced,
  nonce,
  speed,
  autoplay,
}: {
  role: RoleSpec;
  reduced: boolean;
  nonce: number;
  speed: Speed;
  autoplay: boolean;
}) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const on = usePlayback(nonce, seen && (autoplay || nonce > 0));
  const frames = roleFrames(role.id, reduced);
  const transition = roleTransition(role.id, frames.property);
  const pose = (frame: { rest: React.CSSProperties; active: React.CSSProperties }) => ({
    ...(on ? frame.active : frame.rest),
    transition,
  });

  // Press is a gesture, not a state: it lands, is held for a beat, and lets go.
  const [pressed, setPressed] = React.useState(false);
  const holdMs = parseMs(role.duration.value) * slowFactor(speed) + 450;
  React.useEffect(() => {
    if (role.id !== "press") return;
    setPressed(on);
    if (!on) return;
    const id = window.setTimeout(() => setPressed(false), holdMs);
    return () => window.clearTimeout(id);
  }, [on, role.id, holdMs]);

  const label = reduced ? "Reduced motion" : "Full motion";
  return (
    <div ref={ref} style={slowStyle(speed)}>
      <Stage label={label}>
        {role.id === "enter" || role.id === "exit" ? (
          <div
            className="flex items-center gap-2 rounded-[var(--radius-md)] bg-card px-3 py-2 shadow-ambient-sm"
            style={pose(frames.subject)}
          >
            <Badge variant="success">live</Badge>
            <span className="text-foreground text-xs">sailor-web deployed</span>
          </div>
        ) : null}

        {role.id === "swap" ? (
          <div className="relative grid h-9 w-40 place-items-center">
            <div
              className="absolute inset-0 grid place-items-center rounded-[var(--radius-md)] bg-card text-foreground text-xs shadow-ambient-sm"
              style={pose(frames.subject)}
            >
              Overview
            </div>
            <div
              className="absolute inset-0 grid place-items-center rounded-[var(--radius-md)] bg-card text-foreground text-xs shadow-ambient-sm"
              style={frames.partner ? pose(frames.partner) : undefined}
            >
              Deployments
            </div>
          </div>
        ) : null}

        {role.id === "shared" ? (
          <div
            className="relative grid w-56 grid-cols-2"
            style={{ gap: "var(--motion-shared-distance)" }}
          >
            <div className="h-10 rounded-[var(--radius-md)] border border-border border-dashed" />
            <div className="h-10 rounded-[var(--radius-md)] border border-border border-dashed" />
            <div
              className="absolute inset-y-0 left-0 grid place-items-center rounded-[var(--radius-md)] bg-primary text-primary-foreground text-xs" // allow-physical: the pose frames move on the x axis, so the slots anchor physically
              style={{ ...pose(frames.subject), width: SLOT_WIDTH }}
            >
              Build
            </div>
            {frames.partner ? (
              <div
                className="absolute inset-y-0 right-0 grid place-items-center rounded-[var(--radius-md)] bg-primary text-primary-foreground text-xs" // allow-physical: the pose frames move on the x axis, so the slots anchor physically
                style={{ ...pose(frames.partner), width: SLOT_WIDTH }}
              >
                Build
              </div>
            ) : null}
          </div>
        ) : null}

        {role.id === "press" ? (
          <Button
            size="sm"
            style={{
              ...(pressed ? frames.subject.active : frames.subject.rest),
              transition,
            }}
            tabIndex={-1}
            type="button"
          >
            Deploy
          </Button>
        ) : null}
      </Stage>
    </div>
  );
}

export function MotionRoleDemos({ roles }: { roles: RoleSpec[] }) {
  const [speed, setSpeed] = React.useState<Speed>(1);
  const [nonce, setNonce] = React.useState(0);
  const osReduced = usePrefersReducedMotion();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <MotionControls
          onReplay={() => setNonce((n) => n + 1)}
          onSpeedChange={setSpeed}
          speed={speed}
        />
        <ReducedMotionNotice />
      </div>

      <div className="flex flex-col divide-y divide-border">
        {roles.map((role) => (
          <article
            className="grid gap-4 py-6 first:pt-0 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]"
            key={role.id}
          >
            <div className="flex flex-col gap-3">
              <h3 className="m-0 text-foreground text-lg leading-heading tracking-heading">
                {role.id}
              </h3>
              <p className="m-0 text-muted-foreground text-sm leading-snug">{role.description}</p>
              <dl className="m-0 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <dt className="text-muted-foreground">duration</dt>
                  <dd className="m-0">
                    <Chip>{show(role.duration)}</Chip>
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="text-muted-foreground">distance</dt>
                  <dd className="m-0">
                    <Chip>{show(role.distance)}</Chip>
                  </dd>
                </div>
                {role.scale ? (
                  <div className="flex items-center gap-1.5">
                    <dt className="text-muted-foreground">scale</dt>
                    <dd className="m-0">
                      <Chip>{show(role.scale)}</Chip>
                    </dd>
                  </div>
                ) : null}
                <div className="flex w-full items-center gap-1.5">
                  <dt className="text-muted-foreground">easing</dt>
                  <dd className="m-0 min-w-0 truncate">
                    <Chip>{show(role.easing)}</Chip>
                  </dd>
                </div>
              </dl>
              <code className="font-mono text-2xs text-muted-foreground">
                --motion-{role.id}-duration / -easing / -distance
              </code>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RoleStage
                autoplay={!osReduced}
                nonce={nonce}
                reduced={false}
                role={role}
                speed={speed}
              />
              <RoleStage autoplay nonce={nonce} reduced role={role} speed={speed} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
