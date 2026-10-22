import type { Metadata } from "next";
import Link from "next/link";
import { DurationCarriers } from "@/components/duration-carriers";
import { MotionRoleDemos } from "@/components/motion-role-demos";
import { SpringCurveSvg } from "@/components/motion-spring-curve";
import {
  distanceSteps,
  motionRoles,
  plainTokens,
  type ScaleStep,
  springPresets,
  staggerSteps,
} from "@/lib/motion/roles";
import { dampingRatio, describeFeel, springOvershoot } from "@/lib/motion/spring";
import { durations, easings, motionComposites } from "@/lib/tokens";
import { Mono, Note, PageHeader, Section, Table } from "../_components/primitives";
import { SimpleRow, SimpleTableHead } from "../_components/token-rows";

export const metadata: Metadata = {
  title: "Motion — tokens",
  description:
    "Motion by role (enter, exit, swap, shared, press), three spring presets, stagger and distance scales, and the four duration rails — generated from the token source and played on the real thing.",
};

/** Shared cycle for the duration rails, in ms. Just past the slowest rail, so
 *  the pause after the last arrival reads as a beat before the next pass rather
 *  than as dead time with four identical bars parked at the end. */
const RAIL_CYCLE_MS = 900;

function msOf(duration: string): number {
  const value = Number.parseFloat(duration);
  if (Number.isNaN(value)) return RAIL_CYCLE_MS;
  return duration.trim().endsWith("ms") ? value : value * 1000;
}

/**
 * Keyframes for the duration rails, generated from the token values.
 *
 * Two goes at this were wrong in opposite directions. `infinite alternate` at
 * each rail's own duration put 100ms on its own clock — five round trips a
 * second, read as a flicker, and four rails out of phase with nothing to
 * compare. Syncing them to a shared cycle fixed the comparison and created a
 * worse problem: with 100–500ms of travel inside a 900ms period, the rails sit
 * parked at an identical endpoint for about four fifths of every cycle. Almost
 * any glance at the page found four identical bars.
 *
 * A demonstration you have to catch at the right moment is not one. So the bar
 * now grows to a width proportional to its own duration, over that duration.
 * Moving, the four leave together and stop one after another. At rest — which
 * is most of the time, and unavoidable — they are four different lengths, in the
 * ratio of the tokens they stand for. There is no frame in which the page says
 * nothing.
 */
function railKeyframes(values: string[]): string {
  const longest = Math.max(...values.map(msOf), 1);
  return values
    .map((duration) => {
      const ms = msOf(duration);
      const stop = Math.min(100, (ms / RAIL_CYCLE_MS) * 100);
      const width = Math.max(6, (ms / longest) * 100);
      return `@keyframes rail-${ms} { 0% { width: 0%; } ${stop.toFixed(3)}% { width: ${width.toFixed(2)}%; } 100% { width: ${width.toFixed(2)}%; } }`;
    })
    .join("\n");
}

function DurationBar({ duration, easing }: { duration: string; easing: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary motion-safe:animate-[var(--rail)_var(--cycle)_var(--rail-ease)_infinite] motion-reduce:w-full"
        style={{
          ["--rail" as string]: `rail-${msOf(duration)}`,
          ["--cycle" as string]: `${RAIL_CYCLE_MS}ms`,
          ["--rail-ease" as string]: easing,
        }}
      />
    </div>
  );
}

/** Stagger as it reads on a timeline: five items, each starting one step after the last. */
function StaggerStrip({ step, longest }: { step: ScaleStep; longest: number }) {
  const total = longest * 4;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Mono>{step.cssVar}</Mono>
        <span className="font-mono text-muted-foreground text-xs tabular-nums">{step.value}</span>
      </div>
      <div aria-hidden className="relative h-9">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            className="absolute h-1.5 rounded-full bg-primary"
            key={index}
            style={{
              left: `${((index * step.amount) / total) * 76}%`,
              top: `${index * 7}px`,
              width: "24%",
            }}
          />
        ))}
      </div>
      {step.description ? (
        <p className="m-0 text-muted-foreground text-xs leading-snug">{step.description}</p>
      ) : null}
    </div>
  );
}

function DistanceBar({ step, longest }: { step: ScaleStep; longest: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Mono>{step.cssVar}</Mono>
        <span className="font-mono text-muted-foreground text-xs tabular-nums">{step.value}</span>
      </div>
      <div aria-hidden className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(step.amount / longest) * 100}%` }}
        />
      </div>
      {step.description ? (
        <p className="m-0 text-muted-foreground text-xs leading-snug">{step.description}</p>
      ) : null}
    </div>
  );
}

export default function MotionPage() {
  const rails = durations("light");
  const roles = motionRoles();
  const springs = springPresets();
  const staggers = staggerSteps();
  const distances = distanceSteps();
  const composites = motionComposites("light");
  const roleRows = composites.filter(
    (item) => item.token.group === "motion" && !item.token.name.startsWith("duration."),
  );
  const otherComposites = composites.filter((item) => !roleRows.includes(item));

  return (
    <div>
      <PageHeader eyebrow="tokens / motion" title="Motion">
        <p>
          Motion is specified by what is changing, not by how fast it should be. Five roles —{" "}
          <Mono>enter</Mono>, <Mono>exit</Mono>, <Mono>swap</Mono>, <Mono>shared</Mono>,{" "}
          <Mono>press</Mono> — each bundle a duration, a curve and a distance. Under them sit the
          primitives: four duration rails, three springs, a stagger scale and a distance scale.
        </p>
        <p>
          Behaviour first, numbers after. Every demo plays at 1× or 0.25×, and every role is shown
          twice — with full motion and with reduced motion — because the second column is the
          contract for anyone who asked for less. Try the springs live in the{" "}
          <Link className="underline underline-offset-4" href="/motion-lab">
            Motion Lab
          </Link>
          .
        </p>
      </PageHeader>

      <Section
        title="Roles"
        note={
          <p>
            A role answers one question — <em>what kind of change is this?</em> Reduced motion drops
            every transform and keeps the opacity change, so a state change still reads as a change
            instead of a snap. That is the policy in the token stylesheet; the right column is that
            policy, not a mock-up of it.
          </p>
        }
      >
        <div className="mb-10">
          <MotionRoleDemos roles={roles} />
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {roleRows.map((item, index) => (
              <SimpleRow key={item.token.path.join(".")} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Springs"
        note={
          <p>
            Only the physics is authored — <Mono>stiffness</Mono>, <Mono>damping</Mono>,{" "}
            <Mono>mass</Mono>. The settle time and the CSS <Mono>linear()</Mono> curve are derived
            from them when the tokens build, so the CSS curve and the JS parameters cannot drift
            apart. The dashed line is the target.
          </p>
        }
      >
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {springs.map((spring) => {
            const overshoot = springOvershoot(spring.params) * 100;
            return (
              <figure
                className="m-0 flex flex-col gap-3 rounded-[var(--radius-lg)] bg-card p-4 shadow-ambient-sm"
                key={spring.name}
              >
                <SpringCurveSvg
                  label={`${spring.name} spring response curve`}
                  params={spring.params}
                />
                <figcaption className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Mono>--spring-{spring.name}</Mono>
                    <span className="font-mono text-muted-foreground text-xs tabular-nums">
                      {spring.duration.value}
                    </span>
                  </div>
                  <span className="font-mono text-muted-foreground text-xs tabular-nums">
                    ζ {dampingRatio(spring.params).toFixed(2)} · overshoot {overshoot.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground text-xs leading-snug">
                    {describeFeel(spring.params)}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {plainTokens("spring").map((item, index) => (
              <SimpleRow key={item.token.path.join(".")} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Stagger and distance"
        note={
          <p>
            Stagger is the gap between consecutive siblings; distance is how far something travels.
            Names are density and reach, not speed — most UI motion is <Mono>xs</Mono> or{" "}
            <Mono>sm</Mono>, and a long distance reads as an event. Scrub a staggered entrance in
            the{" "}
            <Link className="underline underline-offset-4" href="/motion-lab#orchestration">
              Motion Lab
            </Link>
            .
          </p>
        }
      >
        <div className="mb-8 grid gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            {staggers.map((step) => (
              <StaggerStrip
                key={step.cssVar}
                longest={Math.max(...staggers.map((s) => s.amount))}
                step={step}
              />
            ))}
          </div>
          <div className="flex flex-col gap-6">
            {distances.map((step) => (
              <DistanceBar
                key={step.cssVar}
                longest={Math.max(...distances.map((s) => s.amount))}
                step={step}
              />
            ))}
          </div>
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {[...plainTokens("stagger"), ...plainTokens("distance")].map((item, index) => (
              <SimpleRow key={item.token.path.join(".")} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Duration rails">
        {/* The carriers first. A rail shows that one number exceeds another,
            which the table already says in digits; what it cannot show is
            whether a duration is right *for the job it is named after*, and
            that is the only question a duration token raises. Each token names
            its own carrier in its description, so each is played on one. */}
        <div className="mb-10">
          <DurationCarriers />
        </div>

        {/* Keyframes derived from the same token values the rows below print,
            so a duration that changes in the source changes the motion here on
            the next build rather than drifting away from its own label. */}
        <style
          dangerouslySetInnerHTML={{ __html: railKeyframes(rails.map((r) => r.token.resolved)) }}
        />
        <div className="mb-8 space-y-5">
          {rails.map((rail) => (
            <div key={rail.token.cssVar}>
              <div className="mb-2 flex items-baseline gap-3">
                <Mono>--{rail.token.cssVar}</Mono>
                <span className="font-mono text-muted-foreground text-xs tabular-nums">
                  {rail.token.resolved}
                </span>
              </div>
              <DurationBar duration={rail.token.resolved} easing="var(--ease-out)" />
            </div>
          ))}
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {rails.map((item, index) => (
              <SimpleRow key={item.token.cssVar} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Easing curves"
        note={
          <p>
            Each curve below traverses at the same duration, so the difference you see is the curve
            and nothing else. <Mono>spring</Mono> overshoots past its endpoint and settles — that is
            the control points, not a rendering artefact.
          </p>
        }
      >
        <div className="mb-8 space-y-5">
          {easings("light").map((curve) => (
            <div key={curve.token.cssVar}>
              <div className="mb-2 flex items-baseline gap-3">
                <Mono>--{curve.token.cssVar}</Mono>
                <span className="font-mono text-muted-foreground text-xs">
                  {curve.token.resolved}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full w-1/3 rounded-full bg-primary motion-safe:animate-[token-sweep_600ms_infinite_alternate]"
                  style={{ animationTimingFunction: curve.token.resolved }}
                />
              </div>
            </div>
          ))}
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {easings("light").map((item, index) => (
              <SimpleRow key={item.token.cssVar} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Composites"
        note={
          <p>
            The semantic <Mono>motion.duration.*</Mono> aliases over the rails, plus the two
            shorthand tokens assembled from a duration and a curve. The shorthands have no Tailwind
            utility because they set several properties at once; use them as a <Mono>var()</Mono>.
          </p>
        }
      >
        <Table>
          <SimpleTableHead />
          <tbody>
            {otherComposites.map((item, index) => (
              <SimpleRow key={item.token.path.join(".")} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Note>
        Entrance animations in product code should go through <Mono>AnimateIn</Mono> from{" "}
        <Mono>@nebutra/ui</Mono>, which already reaches for these rails. Writing a{" "}
        <Mono>motion.div</Mono> with hand-typed numbers puts a fifth, unnamed rail into the system.
      </Note>

      {/* The one keyframe this page needs. Declared here, at the only place it is used. */}
      <style>{`@keyframes token-sweep { from { transform: translateX(0); } to { transform: translateX(200%); } }`}</style>
    </div>
  );
}
