import type { Metadata } from "next";
import { durations, easings, motionComposites } from "@/lib/tokens";
import { Mono, Note, PageHeader, Section, Table } from "../_components/primitives";
import { SimpleRow, SimpleTableHead } from "../_components/token-rows";

export const metadata: Metadata = {
  title: "Motion — tokens",
  description:
    "The four duration rails and four easing curves, generated from the source, each rail animated at its own value.",
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

export default function MotionPage() {
  const rails = durations("light");

  return (
    <div>
      <PageHeader eyebrow="tokens / motion" title="Motion">
        <p>
          Four duration rails, named for what they are <em>for</em> rather than for how fast they
          are. That is the governance decision recorded in the source itself, and the descriptions
          below are quoted from it: a hover response and a hero entrance are different jobs, not
          different points on a fast-to-slow slider.
        </p>
        <p>
          Every bar below leaves at the same instant and moves for exactly its own duration, at full
          speed — the fast rail arrives first and waits while the slow one is still travelling, so
          the gap between arrivals is the difference between the tokens. They stop entirely under{" "}
          <Mono>prefers-reduced-motion</Mono>.
        </p>
      </PageHeader>

      <Section title="Duration rails">
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
                <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
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
                <span className="font-mono text-[12px] text-muted-foreground">
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
            {motionComposites("light").map((item, index) => (
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
