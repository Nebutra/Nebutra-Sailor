import type { Metadata } from "next";
import { assertStillMissing, fontStacks, leading, tracking, typeScale } from "@/lib/tokens";
import { Mono, PageHeader, Section, Table } from "../_components/primitives";
import { SimpleRow, SimpleTableHead } from "../_components/token-rows";

export const metadata: Metadata = {
  title: "Type — tokens",
  description:
    "Font stacks, the type scale, letter-spacing and line-height as the source declares them.",
};

export default function TypePage() {
  assertStillMissing("light");

  const stacks = fontStacks("light");
  const scale = typeScale("light");

  return (
    <div>
      <PageHeader eyebrow="tokens / type" title="Type">
        <p>
          Four families are tokenised: the font stacks, the type scale, letter-spacing, and
          line-height. Each step of the scale carries its own leading and tracking, so{" "}
          <Mono>text-2xl</Mono> alone is a finished heading.
        </p>
        <p>
          The order inside each stack is the design decision, not an accident — Geist first so it
          keeps Latin and the numerals, with the CJK face behind it so only CJK falls through. The
          source's own note on that is quoted below, at length, because it is the reason the stacks
          look redundant and are not.
        </p>
      </PageHeader>

      <Section
        title="Font stacks"
        note={
          <p>
            Each specimen below is rendered in its own stack. If the licensed CJK face is loaded,
            the Chinese line changes shape between <Mono>--font-sans</Mono> and{" "}
            <Mono>--font-cn</Mono>; if it is not, both fall back and look the same — which is itself
            the useful signal.
          </p>
        }
      >
        <div className="mb-8 space-y-6">
          {stacks.map((stack) => (
            <div key={stack.token.cssVar}>
              <div className="mb-2 flex flex-wrap items-baseline gap-3">
                <Mono>--{stack.token.cssVar}</Mono>
                {stack.use.utility ? (
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {stack.use.utility}
                  </span>
                ) : null}
              </div>
              <div
                className="rounded-panel bg-card p-5 shadow-ambient-sm"
                style={{ fontFamily: `var(--${stack.token.cssVar})` }}
              >
                <p className="text-2xl text-foreground tracking-tight">
                  Ship the design system as a product surface
                </p>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  把设计系统当成产品界面来交付 · 0123456789 · 1lI0O
                </p>
              </div>
            </div>
          ))}
        </div>
        <Table>
          <SimpleTableHead valueLabel="Stack" />
          <tbody>
            {stacks.map((item, index) => (
              <SimpleRow key={item.token.cssVar} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Letter-spacing"
        note={
          <p>
            Negative tracking at display sizes is what keeps a large heading from reading as loose.
            The three steps below are applied to the same string at the same size, so the difference
            is the token.
          </p>
        }
      >
        <div className="mb-6 space-y-4">
          {tracking("light").map((step) => (
            <div key={step.token.cssVar} className="rounded-panel bg-card p-5 shadow-ambient-sm">
              <p className="mb-2 font-mono text-[11px] text-muted-foreground">
                --{step.token.cssVar} · {step.token.resolved}
              </p>
              <p
                className="font-semibold text-3xl text-foreground"
                style={{ letterSpacing: step.token.resolved }}
              >
                Tokens, measured
              </p>
            </div>
          ))}
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {tracking("light").map((item, index) => (
              <SimpleRow key={item.token.cssVar} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Line-height">
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {leading("light").map((step) => (
            <div key={step.token.cssVar} className="rounded-panel bg-card p-5 shadow-ambient-sm">
              <p className="mb-2 font-mono text-[11px] text-muted-foreground">
                --{step.token.cssVar} · {step.token.resolved}
              </p>
              <p
                className="font-semibold text-2xl text-foreground"
                style={{ lineHeight: step.token.resolved }}
              >
                A headline long enough
                <br />
                to wrap onto a second line
              </p>
            </div>
          ))}
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {leading("light").map((item, index) => (
              <SimpleRow key={item.token.cssVar} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Type scale"
        note={
          <p>
            Read from <Mono>core.json:type</Mono>. Sizes keep Tailwind's names and values; each step
            adds leading and a tracking curve — slightly open below 14px, neutral at 13–14,
            tightening to −0.045em at display sizes. Every specimen is set through the step's own
            variables, so a Brand Package that retunes the scale shows up here unchanged.
          </p>
        }
      >
        <div className="divide-y divide-border rounded-panel border border-border bg-card">
          {scale.map((step) => (
            <div
              key={step.step}
              className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-4 px-5 py-4"
            >
              <div className="space-y-1">
                <Mono>{step.utility}</Mono>
                <p className="font-mono text-2xs text-muted-foreground">
                  {step.size.resolved} · {step.leading.resolved} · {step.tracking.resolved}
                </p>
              </div>
              <p
                className="truncate text-foreground"
                style={{
                  fontSize: `var(--${step.size.cssVar})`,
                  lineHeight: `var(--${step.leading.cssVar})`,
                  letterSpacing: `var(--${step.tracking.cssVar})`,
                }}
              >
                云毓智能 Nebutra — ship the product
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
