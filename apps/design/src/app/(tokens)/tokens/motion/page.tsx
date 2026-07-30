import type { Metadata } from "next";
import { durations, easings, motionComposites } from "@/lib/tokens";
import { Mono, Note, PageHeader, Section, Table } from "../_components/primitives";
import { SimpleRow, SimpleTableHead } from "../_components/token-rows";

export const metadata: Metadata = {
  title: "Motion — tokens",
  description:
    "The four duration rails and four easing curves, generated from the source, each rail animated at its own value.",
};

/**
 * A bar that traverses once, on load, at the token's own duration and easing.
 *
 * CSS animation only — no client component, no JavaScript, and it honours
 * `prefers-reduced-motion` by not animating at all under that query. A page about
 * motion tokens that ignored the reduced-motion preference would be making the
 * same category of error as one that hardcoded a colour.
 */
function DurationBar({ duration }: { duration: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full w-1/3 rounded-full bg-primary motion-safe:animate-[token-sweep_var(--sweep)_var(--ease-in-out)_infinite_alternate]"
        style={{ ["--sweep" as string]: duration }}
      />
    </div>
  );
}

export default function MotionPage() {
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
          The bars animate at each token's real value. They stop entirely under{" "}
          <Mono>prefers-reduced-motion</Mono>.
        </p>
      </PageHeader>

      <Section title="Duration rails">
        <div className="mb-8 space-y-5">
          {durations("light").map((rail) => (
            <div key={rail.token.cssVar}>
              <div className="mb-2 flex items-baseline gap-3">
                <Mono>--{rail.token.cssVar}</Mono>
                <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
                  {rail.token.resolved}
                </span>
              </div>
              <DurationBar duration={rail.token.resolved} />
            </div>
          ))}
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {durations("light").map((item, index) => (
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
