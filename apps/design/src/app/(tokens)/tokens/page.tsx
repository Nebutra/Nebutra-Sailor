import type { Metadata } from "next";
import Link from "next/link";
import {
  aliases,
  assertStillMissing,
  belowReference,
  elevationRamp,
  failures,
  formatRatio,
  MODES,
  REGISTERED_COUNT,
  SOURCE_FILES,
  scales,
  semanticRoles,
  tokenSet,
  unclaimed,
} from "@/lib/tokens";
import { Chip, Mono, Note, PageHeader, Panel, Section } from "./_components/primitives";

export const metadata: Metadata = {
  title: "Tokens",
  description:
    "Every token in the design system, generated from the DTCG source at build time — with computed OKLCH, measured contrast, and the layer each one belongs to.",
};

const PAGES = [
  {
    href: "/tokens/color",
    title: "Colour",
    body: "The 12-step scales, the semantic roles, the brand aliases and the primitive palettes. Every step carries its resolved value, its computed OKLCH, and contrast measured against the backdrops the source pairs it with.",
  },
  {
    href: "/tokens/elevation",
    title: "Elevation",
    body: "The shadow ramp on real surfaces in both modes at once, because the dark values are chosen independently rather than mirrored — which no table can show.",
  },
  {
    href: "/tokens/shape",
    title: "Shape and space",
    body: "The radius ladder with its intent aliases, container widths, breakpoints — and a straight account of why there is no spacing scale here.",
  },
  {
    href: "/tokens/type",
    title: "Type",
    body: "Font stacks rendered in themselves, letter-spacing and line-height applied to the same string. Font size is not tokenised, and the page says so.",
  },
  {
    href: "/tokens/motion",
    title: "Motion",
    body: "Four duration rails named for intent, four easing curves, each animated at its own value and stopped under prefers-reduced-motion.",
  },
  {
    href: "/tokens/layers",
    title: "Layers",
    body: "Which file is source and which is output, decided by reading each file's own header. Plus the nine values per mode that nobody wrote — the computed border tier.",
  },
  {
    href: "/tokens/traps",
    title: "Two traps",
    body: "The two ways a correct token silently renders nothing, demonstrated live and side by side with the version that works.",
  },
];

export default function TokensIndexPage() {
  assertStillMissing("light");

  const light = tokenSet("light");
  const leftovers = unclaimed("light");

  const summary = MODES.map((mode) => {
    const colours = [
      ...semanticRoles(mode),
      ...scales(mode).flatMap((scale) => scale.steps),
      ...aliases(mode),
    ];
    return {
      mode,
      total: tokenSet(mode).tokens.length,
      required: failures(colours),
      reference: belowReference(colours).length,
      modeSpecificShadows: elevationRamp(mode).filter((step) => step.otherMode !== null).length,
    };
  });

  return (
    <div>
      <PageHeader eyebrow="tokens" title="Tokens">
        <p>
          {light.tokens.length} tokens per mode, read from four JSON files at build time and
          rendered here with nothing typed in between. If a token is added to{" "}
          <Mono>packages/design/design-tokens/tokens/**</Mono>, it appears on these pages at the
          next build with no edit to this app. If one is renamed, the name changes here too — the
          site and the token build import the <em>same</em> namer.
        </p>
        <p>
          The point is not documentation. It is that a change to the design system has somewhere it
          becomes visible: a contrast ratio that drops below its bar shows up as a finding, and a
          shadow that stops resolving stops rendering on the elevation page.
        </p>
      </PageHeader>

      <Section title="Where the numbers come from">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(SOURCE_FILES).map(([key, path]) => (
            <Panel key={key}>
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                {key}
              </p>
              <p className="mt-2 break-all">
                <Mono>{path}</Mono>
              </p>
            </Panel>
          ))}
        </div>
        <div className="mt-4">
          <Note>
            Everything downstream of those four files is generated —{" "}
            <Mono>packages/design/tokens/styles.css</Mono> included. The{" "}
            <Link className="underline decoration-dotted underline-offset-2" href="/tokens/layers">
              layers page
            </Link>{" "}
            proves which is which by quoting each file's own header, and {REGISTERED_COUNT} of the
            emitted variables are registered as Tailwind utilities.
          </Note>
        </div>
      </Section>

      <Section
        title="Current state"
        note={
          <p>
            Measured on this build. A required bar is one the source's own pairing has to clear; a
            reference line is the 3:1 boundary figure, which WCAG 1.4.11 applies only where the
            boundary is the sole means of identifying a component.
          </p>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {summary.map((entry) => (
            <Panel key={entry.mode} tone="muted">
              <p className="mb-3 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                {entry.mode}
              </p>
              <dl className="space-y-2 text-[13px]">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">tokens</dt>
                  <dd className="font-mono tabular-nums">{entry.total}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">pairings below a required bar</dt>
                  <dd>
                    {entry.required.length === 0 ? (
                      <Chip tone="pass">none</Chip>
                    ) : (
                      <Chip tone="fail">{entry.required.length}</Chip>
                    )}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">below the 3:1 reference line</dt>
                  <dd>
                    <Chip tone="warn">{entry.reference}</Chip>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">mode-specific shadow steps</dt>
                  <dd className="font-mono tabular-nums">{entry.modeSpecificShadows}</dd>
                </div>
              </dl>
              {entry.required.length > 0 ? (
                <ul className="mt-4 space-y-1.5">
                  {entry.required.map(({ entry: measured, pairing }) => (
                    <li
                      key={`${measured.token.cssVar}-${pairing.backdrop.cssVar}`}
                      className="text-[12.5px]"
                    >
                      <Mono>--{measured.token.cssVar}</Mono>{" "}
                      <span className="text-muted-foreground">on</span>{" "}
                      <Mono>--{pairing.backdrop.cssVar}</Mono>{" "}
                      <span className="font-mono text-[12px] tabular-nums">
                        {formatRatio(pairing.verdict.ratio)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          ))}
        </div>
      </Section>

      <Section title="Pages">
        <div className="grid gap-4 sm:grid-cols-2">
          {PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="rounded-panel bg-card p-5 shadow-ambient-sm transition-shadow duration-flow ease-out hover:shadow-ambient-md"
            >
              <p className="font-medium text-[15px] text-foreground">{page.title}</p>
              <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{page.body}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="Tokens no page claims"
        note={
          <p>
            The complement of everything above. This list is rendered rather than swallowed: a group
            added to the source shows up here immediately, with its value and its variable name, and
            stays visible until it is given a proper page. A token existing in the source and
            nowhere on this site is the one outcome that would defeat the point.
          </p>
        }
      >
        {leftovers.length === 0 ? (
          <Panel tone="muted">
            <p className="text-[13px] text-muted-foreground">
              Every DTCG group in the source is rendered on one of the pages above.
            </p>
          </Panel>
        ) : (
          <Panel tone="muted">
            <ul className="space-y-1.5">
              {leftovers.map((token) => (
                <li key={token.path.join(".")} className="text-[13px]">
                  <Mono>--{token.cssVar ?? token.path.join("-")}</Mono>{" "}
                  <span className="text-muted-foreground">{token.resolved}</span>{" "}
                  <Chip tone="neutral">{token.group}</Chip>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </Section>
    </div>
  );
}
