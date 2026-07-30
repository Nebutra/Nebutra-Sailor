import type { Metadata } from "next";
import {
  assertStillMissing,
  breakpointSteps,
  containerSteps,
  MISSING_FAMILIES,
  radiusSteps,
} from "@/lib/tokens";
import { Mono, Note, PageHeader, Panel, Section, Table } from "../_components/primitives";
import { SimpleRow, SimpleTableHead } from "../_components/token-rows";

export const metadata: Metadata = {
  title: "Shape and space — tokens",
  description:
    "The radius ladder, container widths and breakpoints, generated from the source — and a straight account of the two families the source does not contain.",
};

export default function ShapePage() {
  // Fails the build if a family this page reports as absent has since been added.
  assertStillMissing("light");

  const radius = radiusSteps("light");
  const spacingGap = MISSING_FAMILIES.find((family) => family.family === "spacing");

  return (
    <div>
      <PageHeader eyebrow="tokens / shape + space" title="Shape and space">
        <p>
          Radius is fully tokenised, with an intent alias for each of the three shapes that matter —{" "}
          <Mono>button</Mono>, <Mono>card</Mono>, <Mono>panel</Mono> — so the shape of a card can be
          retuned in one place instead of at every call site.
        </p>
        <p>
          Spacing is <strong>not</strong> tokenised, and this page says so rather than quietly
          rendering Tailwind's built-in scale as though it were ours.
        </p>
      </PageHeader>

      <Section
        title="Radius"
        note={
          <p>
            The ladder runs from flush to pill. Each step below is rendered at its own value, so the
            visual jump between steps is the actual jump.
          </p>
        }
      >
        <div className="mb-8 flex flex-wrap gap-4">
          {radius
            .filter((step) => step.token.resolved !== "0")
            .map((step) => (
              <div key={step.token.cssVar} className="w-[7.5rem]">
                <div
                  className="h-20 bg-secondary"
                  style={{ borderRadius: step.token.resolved }}
                  title={`--${step.token.cssVar} = ${step.token.resolved}`}
                />
                <p className="mt-2">
                  <Mono>{step.token.name.split(".").at(-1)}</Mono>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <Mono>{step.token.resolved}</Mono>
                </p>
              </div>
            ))}
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {radius.map((item, index) => (
              <SimpleRow key={item.token.cssVar} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Container widths"
        note={
          <p>
            Three widths, chosen by the job the content is doing rather than by a t-shirt size. Note
            the provenance column: <Mono>core.json</Mono> also declares these under{" "}
            <Mono>size.container.*</Mono>, and <Mono>semantic.json</Mono> re-declares them under{" "}
            <Mono>container.*</Mono>. Both name the same CSS variable, so the build emits it once —
            from the later file. The rows below are the ones that actually ship.
          </p>
        }
      >
        <div className="mb-6 space-y-3">
          {containerSteps("light").map((step) => (
            <div key={step.token.cssVar}>
              <div
                className="h-9 rounded-md bg-secondary"
                style={{ maxWidth: step.token.resolved }}
              />
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                <Mono>--{step.token.cssVar}</Mono> · {step.token.resolved}
              </p>
            </div>
          ))}
        </div>
        <Table>
          <SimpleTableHead />
          <tbody>
            {containerSteps("light").map((item, index) => (
              <SimpleRow key={item.token.cssVar} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Breakpoints">
        <Table>
          <SimpleTableHead />
          <tbody>
            {breakpointSteps("light").map((item, index) => (
              <SimpleRow key={item.token.cssVar} item={item} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>

      {spacingGap ? (
        <Section title="Spacing is not in the source">
          <Panel tone="muted">
            <p className="text-[14px] text-foreground leading-relaxed">{spacingGap.actualSource}</p>
            <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">
              {spacingGap.consequence}
            </p>
          </Panel>
          <div className="mt-5">
            <Note>
              There is no generated spacing page here because there is nothing to generate it from.
              Drawing one by hand would create a second scale that agrees with Tailwind's today and
              silently disagrees with it after the next upgrade — the precise failure this site was
              built to remove. The absence is the accurate answer, and it is checked at build time
              by <Mono>assertStillMissing()</Mono>: add a <Mono>spacing</Mono> group to the source
              and this section stops compiling until it is replaced with a real one.
            </Note>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
