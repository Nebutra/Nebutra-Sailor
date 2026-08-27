import { DesignLanguageSwitcher } from "@nebutra/theme/language-switcher";
import Link from "next/link";
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
    <div className="flex flex-col gap-14">
      {/* The first screen is the system running, not a description of it. The
          picker sits directly above the surface it rewrites, so the causal link
          is visible in one glance instead of requiring a trip to the header. */}
      <section className="flex flex-col gap-8">
        <header className="max-w-4xl">
          {/* text-balance so the two clauses stay on their own lines instead of
              breaking mid-phrase at the container edge. */}
          <h1 className="text-balance font-semibold text-4xl text-foreground tracking-tight sm:text-[52px] sm:leading-[1.05]">
            One switch, <span className="text-primary">the whole language</span>.
          </h1>
          <p className="mt-5 max-w-3xl text-[16px] text-muted-foreground leading-relaxed">
            {SITE_NAME} is a verification surface, not a documentation site. It imports the real
            packages and renders them — so a token that breaks a component breaks this page, and
            changing the design language below changes an actual product screen rather than a
            picture of one.
          </p>
        </header>

        <DesignLanguageSwitcher caption variant="picker" />

        <LiveSpecimen />
      </section>

      {/* Four numbers, all counted from source at build time. They sit after
          the demonstration rather than before it: the panel above is the claim,
          and these are the receipts. The gap-px over a tinted backdrop draws
          the cell divisions as seams in the background, not as borders. */}
      <section className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-border/40 sm:grid-cols-4">
          {proof.map((cell) => (
            <div className="bg-card px-5 py-4" key={cell.key}>
              <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {cell.key}
              </dt>
              <dd className="mt-2 font-semibold text-2xl text-foreground tabular-nums tracking-tight">
                {cell.value}
              </dd>
              <p className="mt-1 text-[12px] text-muted-foreground leading-snug">{cell.note}</p>
            </div>
          ))}
        </dl>
        <p className="max-w-3xl text-[13px] text-muted-foreground leading-relaxed">
          {m.readers.toLocaleString()} files across the product read the dimensions that switch
          moves. None of the figures above is typed in — each is counted from the token source and
          the component barrels at build time.
        </p>
      </section>

      {/* Five entries in a two-column grid leave the last one beside a hole.
          The odd card takes the full row instead, which reads as a closing band
          rather than a gap where a sixth thing was meant to go. */}
      <section className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section, index) => (
          <Link
            className={`flex flex-col rounded-panel bg-card p-5 shadow-ambient-sm transition-shadow duration-flow ease-out hover:shadow-ambient-md${
              index === SECTIONS.length - 1 && SECTIONS.length % 2 === 1 ? " sm:col-span-2" : ""
            }`}
            href={section.href}
            key={section.href}
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-medium text-[15px] text-foreground">{section.title}</p>
              <p className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                {section.stat(m)}
              </p>
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{section.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
