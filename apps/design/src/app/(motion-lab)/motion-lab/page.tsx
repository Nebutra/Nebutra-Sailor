import type { Metadata } from "next";
import Link from "next/link";
import { MotionGallery } from "@/components/motion-gallery";
import { MotionInterruptTest } from "@/components/motion-interrupt-test";
import { MotionOrchestration } from "@/components/motion-orchestration";
import { MotionReducedCompare } from "@/components/motion-reduced-compare";
import { MotionSpringTuner } from "@/components/motion-spring-tuner";
import { distanceSteps, motionRoles, springPresets, staggerSteps } from "@/lib/motion/roles";
import { Mono, PageHeader, Section } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Motion Lab",
  description:
    "Tune a spring and copy it as a token, CSS linear() or JS. Scrub a stagger timeline, compare full and reduced motion, interrupt an animation mid-flight, and watch the motion of the real components.",
};

export default function MotionLabPage() {
  const presets = springPresets();
  const staggers = staggerSteps();
  const distance = distanceSteps().find((step) => step.name === "lg");
  const press = motionRoles().find((role) => role.id === "press");
  if (!distance || !press) {
    throw new Error("[apps/design] motion distance.lg or motion.press is missing from the tokens");
  }

  return (
    <div>
      <PageHeader eyebrow="motion lab" title="Motion Lab">
        <p>
          A bench for the motion tokens. Tune a spring until it feels right and take it away as a
          token, a CSS <Mono>linear()</Mono> easing or three numbers for JS. Scrub a stagger. Put
          full and reduced motion side by side. Interrupt an animation and watch what it does with
          the interruption. Everything here is driven by the tokens documented on{" "}
          <Link className="text-foreground underline underline-offset-4" href="/tokens/motion">
            Motion tokens
          </Link>
          ; the slider values are the only numbers you type in.
        </p>
      </PageHeader>

      <Section
        note={
          <p>
            A spring is three numbers: stiffness pulls toward the target, damping resists, mass is
            how hard it is to get moving. The curve is the exact solution of that system, so the CSS
            you copy is the curve you see, sampled into a <Mono>linear()</Mono> easing. Token output
            is physics only; the build derives duration and easing from it.
          </p>
        }
        title="Spring tuner"
      >
        <MotionSpringTuner presets={presets} />
      </Section>

      <Section
        note={
          <>
            <p>
              Stagger is a start delay, nothing more: row <Mono>n</Mono> starts{" "}
              <Mono>n × step</Mono> after the first. The scale has three steps, tight, normal and
              loose, and the timeline shows why a loose stagger on many rows takes so long to
              finish.
            </p>
            <p>
              The real <Mono>AnimateInGroup</Mono> runs at the bottom. Its fast, normal and slow
              steps are 40, 60 and 80 ms, written into <Mono>@nebutra/ui</Mono> rather than read
              from the token scale (30, 60, 100 ms). Only normal agrees.
            </p>
          </>
        }
        title="Orchestration"
      >
        <MotionOrchestration distance={distance} presets={presets} staggers={staggers} />
      </Section>

      <Section
        note={
          <p>
            Reduced motion removes movement and keeps opacity, so a change still reads as a change.
            Both columns play from the same trigger and are built from the same role tokens; only
            the policy differs.
          </p>
        }
        title="Reduced motion"
      >
        <MotionReducedCompare pressDuration={press.duration.value} />
      </Section>

      <Section
        note={
          <p>
            Click Move, then click it again before the block arrives. A spring keeps the speed the
            block already had, which is why interrupted spring motion looks continuous where a
            restarted animation looks broken.
          </p>
        }
        title="Interruption"
      >
        <MotionInterruptTest presets={presets} />
      </Section>

      <Section
        note={
          <p>
            The motion of components that ship in <Mono>@nebutra/ui</Mono>, not mock-ups. Each card
            names the tokens behind it, including where there are none yet.
          </p>
        }
        title="Behaviours"
      >
        <MotionGallery />
      </Section>
    </div>
  );
}
