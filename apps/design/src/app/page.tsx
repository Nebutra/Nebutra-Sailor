import Link from "next/link";
import { coveredNames, GROUPS } from "@/lib/components/registry";
import { componentExports } from "@/lib/components/ui-source";
import switchability from "@/lib/generated/switchability.json";
import { SITE_NAME } from "@/lib/site";
import { aliases, failures, scales, semanticRoles, tokenSet } from "@/lib/tokens";

/**
 * Everything on this page is counted at build time from the same sources the
 * rest of the site reads. Nothing is typed in, which is the one property that
 * makes the numbers worth showing at all: a figure a person maintains by hand
 * is wrong within a week, and this site's argument is that it cannot drift.
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

  const masthead = [
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
    <div>
      <header className="max-w-3xl">
        <h1 className="font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
          {SITE_NAME}
        </h1>
        <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed">
          A verification surface, not a documentation site. It imports the real packages and renders
          them, so a token that breaks a component breaks this page.
        </p>
      </header>

      {/* The masthead is the argument, stated before the site asks to be
          trusted: four numbers, all counted from source at build time. The
          gap-px over a tinted backdrop draws the cell divisions as seams in the
          background rather than as borders. */}
      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-border/40 sm:grid-cols-4">
        {masthead.map((cell) => (
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            className="flex flex-col rounded-panel bg-card p-5 shadow-ambient-sm transition-shadow duration-flow ease-out hover:shadow-ambient-md"
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
      </div>

      <p className="mt-10 max-w-3xl text-[13px] text-muted-foreground leading-relaxed">
        The language row above swaps a whole Brand Package — colour roles, shape, elevation, type
        and motion together, not a palette. {m.readers.toLocaleString()} files across the product
        read the dimensions it moves.
      </p>
    </div>
  );
}
