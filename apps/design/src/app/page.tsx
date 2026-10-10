import { ArrowRight } from "@nebutra/icons";
import { Button, Kbd } from "@nebutra/ui/primitives";
import Link from "next/link";
import { ActiveLanguageCaption } from "@/components/language-switcher";
import { LiveSpecimen } from "@/components/live-specimen";
import { coveredNames, GROUPS } from "@/lib/components/registry";
import { componentExports } from "@/lib/components/ui-source";
import switchability from "@/lib/generated/switchability.json";
import { SITE_NAME } from "@/lib/site";
import { aliases, failures, scales, semanticRoles, tokenSet } from "@/lib/tokens";

/**
 * Everything counted on this page is measured at build time from the same
 * sources the rest of the site reads. Nothing is typed in, which is the one
 * property that makes the numbers worth showing at all: a figure a person
 * maintains by hand is wrong within a week, and this site's argument is that it
 * cannot drift.
 */
function measure() {
  const light = tokenSet("light");
  const colours = [
    ...semanticRoles("light"),
    ...scales("light").flatMap((scale) => scale.steps),
    ...aliases("light"),
  ];

  const claimed = coveredNames();
  let exports = 0;
  let covered = 0;
  for (const group of GROUPS) {
    const list = componentExports(group.barrel);
    exports += list.length;
    covered += list.filter((entry) => claimed.has(entry.name)).length;
  }

  const dimensions = switchability.dimensions as ReadonlyArray<{
    id: string;
    consumers: number;
    status: string;
  }>;
  const live = dimensions.filter((dimension) => dimension.status === "live");

  return {
    tokens: light.tokens.length,
    contrastFailures: failures(colours).length,
    exports,
    covered,
    live: live.length,
    dimensions: dimensions.length,
    readers: live.reduce((sum, dimension) => sum + dimension.consumers, 0),
  };
}

type Measured = ReturnType<typeof measure>;

const SECTIONS: ReadonlyArray<{
  href: string;
  title: string;
  body: string;
  stat: (m: Measured) => string;
}> = [
  {
    href: "/tokens",
    title: "Tokens",
    body: "Read from the DTCG source at build time, with computed OKLCH and measured contrast for every pairing the source declares.",
    stat: (m) => `${m.tokens} per mode`,
  },
  {
    href: "/components",
    title: "Components",
    body: "The real @nebutra/ui exports rendered against live tokens. A newly exported component shows up here as a gap rather than going unnoticed.",
    stat: (m) => `${m.covered} of ${m.exports}`,
  },
  {
    href: "/tokens/switchability",
    title: "Switchability",
    body: "Which design-language dimensions a brand switch actually moves, measured by who reads them — not by how many properties a skin declares.",
    stat: (m) => `${m.live} of ${m.dimensions} live`,
  },
  {
    href: "/tokens/layers",
    title: "Layers",
    body: "Where each value is authored, where it is generated, and which file overwrites which. The pipeline itself, not a diagram of it.",
    stat: () => "brand → tokens → ui",
  },
  {
    href: "/tokens/traps",
    title: "Traps",
    body: "The failures this system produces silently — a bare channel in a colour slot, an alias written where the source is read — each with the shape that causes it.",
    stat: () => "fails quietly",
  },
];

export default function HomePage() {
  const m = measure();

  const proof = [
    { key: "Tokens", value: String(m.tokens), note: "per mode, generated" },
    { key: "Components", value: `${m.covered}/${m.exports}`, note: "exports with a page" },
    { key: "Dimensions", value: `${m.live}/${m.dimensions}`, note: "a brand switch moves" },
    {
      key: "Contrast",
      value: m.contrastFailures === 0 ? "pass" : String(m.contrastFailures),
      note: m.contrastFailures === 0 ? "every declared pairing" : "pairings below their bar",
    },
  ];

  return (
    <div className="flex flex-col gap-16">
      {/* The first screen is the system running, not a description of it. The
          language control lives in the sidebar on every page; here the hero
          names the active language live, so the link between that control and
          the surface below is stated where the surface starts. */}
      <section className="flex flex-col gap-10">
        <header className="flex max-w-text flex-col gap-6">
          <p className="m-0 font-mono text-muted-foreground text-xs">
            @nebutra/ui · @nebutra/tokens · @nebutra/theme
          </p>
          {/* text-balance so the two clauses stay on their own lines instead of
              breaking mid-phrase at the container edge. Two inks rather than a
              colour: the claim in foreground, its object in the secondary
              ink, so the line reads the same under every language. */}
          <h1 className="m-0 text-balance font-semibold text-4xl text-foreground tracking-tight sm:text-5xl">
            One switch, <span className="text-muted-foreground">the whole language.</span>
          </h1>
          <p className="m-0 max-w-2xl text-base text-muted-foreground leading-relaxed">
            {SITE_NAME} is a verification surface, not a documentation site. It imports the real
            packages and renders them — so a token that breaks a component breaks this page, and
            changing the design language changes an actual product screen rather than a picture of
            one.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/components">Browse components</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tokens">Foundations</Link>
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-ui">
            <ActiveLanguageCaption />
            <span className="hidden items-center gap-1.5 text-muted-foreground text-xs lg:inline-flex">
              Switch from the sidebar, or press <Kbd small>L</Kbd>
            </span>
          </div>
          <LiveSpecimen />
        </div>
      </section>

      {/* Four numbers, all counted from source at build time. They sit after
          the demonstration rather than before it: the panel above is the claim,
          and these are the receipts. The gap-px over the border colour draws
          the cell divisions as hairlines without doubling any edge. */}
      <section className="flex flex-col gap-4">
        <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-4">
          {proof.map((cell) => (
            <div className="bg-card px-5 py-5" key={cell.key}>
              <dt className="text-muted-foreground text-xs">{cell.key}</dt>
              <dd className="m-0 mt-2 font-semibold text-2xl text-foreground tabular-nums tracking-tight">
                {cell.value}
              </dd>
              <p className="m-0 mt-1 text-muted-foreground text-xs">{cell.note}</p>
            </div>
          ))}
        </dl>
        <p className="m-0 max-w-3xl text-muted-foreground text-ui leading-relaxed">
          {m.readers.toLocaleString()} files across the product read the dimensions that switch
          moves. None of the figures above is typed in — each is counted from the token source and
          the component barrels at build time.
        </p>
      </section>

      {/* Five entries in a two-column grid leave the last one beside a hole.
          The odd card takes the full row instead, which reads as a closing band
          rather than a gap where a sixth thing was meant to go. */}
      <section className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section, index) => (
          <Link
            className={`group flex flex-col rounded-panel border border-border bg-card p-5 no-underline transition-[border-color,box-shadow] duration-flow ease-out hover:border-input hover:shadow-ambient-sm${
              index === SECTIONS.length - 1 && SECTIONS.length % 2 === 1 ? " sm:col-span-2" : ""
            }`}
            href={section.href}
            key={section.href}
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="m-0 inline-flex items-center gap-1.5 font-medium text-foreground text-sm">
                {section.title}
                <ArrowRight
                  aria-hidden
                  className="size-3.5 text-muted-foreground opacity-0 transition-[opacity,transform] duration-flow group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </p>
              <p className="m-0 shrink-0 text-muted-foreground text-xs tabular-nums">
                {section.stat(m)}
              </p>
            </div>
            <p className="m-0 mt-2 text-muted-foreground text-ui leading-relaxed">{section.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
