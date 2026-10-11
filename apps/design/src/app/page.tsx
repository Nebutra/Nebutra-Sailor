import { brand } from "@nebutra/brand/metadata";
import * as AllIcons from "@nebutra/icons";
import { ArrowRight } from "@nebutra/icons";
import { Kbd } from "@nebutra/ui/primitives";
import Link from "next/link";
import type * as React from "react";
import {
  BrandVisual,
  ColourVisual,
  ComponentsVisual,
  ElevationVisual,
  IconsVisual,
  TypeVisual,
} from "@/components/home-visuals";
import { LanguageGallery } from "@/components/language-gallery";
import { coveredNames, GROUPS } from "@/lib/components/registry";
import { componentExports } from "@/lib/components/ui-source";
import switchability from "@/lib/generated/switchability.json";
import { SITE_NAME } from "@/lib/site";
import { aliases, failures, scales, semanticRoles, tokenSet } from "@/lib/tokens";
import { BAND } from "./(tokens)/tokens/_components/primitives";

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
    // Counted the way /icons counts them, so the two pages cannot disagree.
    icons: Object.keys(AllIcons).filter((name) => name !== "IconProps").length,
  };
}

/**
 * The foundations, as Geist's front door lays them out: a two-column grid of
 * hairline cells, a live specimen on top, a name and one line under it. The
 * stat in each cell's corner is counted at build time like everything else.
 */
const CELLS: ReadonlyArray<{
  href: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  stat?: (m: ReturnType<typeof measure>) => string;
}> = [
  {
    href: "/components",
    title: "Components",
    body: "The real @nebutra/ui exports, rendered against live tokens.",
    visual: <ComponentsVisual />,
    stat: (m) => `${m.covered} of ${m.exports} documented`,
  },
  {
    href: "/tokens/color",
    title: "Colour",
    body: "Grayscale first; one blue for focus and selection, used sparingly.",
    visual: <ColourVisual />,
    stat: (m) =>
      m.contrastFailures === 0
        ? "every pairing passes"
        : `${m.contrastFailures} pairings below their bar`,
  },
  {
    href: "/brand",
    title: "Brand",
    body: "The mark, the wordmark and the rules for placing them.",
    visual: <BrandVisual />,
  },
  {
    href: "/icons",
    title: "Icons",
    body: "One set for every product surface, tree-shaken per glyph.",
    visual: <IconsVisual />,
    stat: (m) => `${m.icons} glyphs`,
  },
  {
    href: "/tokens/type",
    title: "Typography",
    body: "A display face for headings, a sans for text, a mono for code.",
    visual: <TypeVisual />,
    stat: (m) => `${m.tokens} tokens per mode`,
  },
  {
    href: "/tokens/elevation",
    title: "Elevation",
    body: "One shadow ramp; a hover moves one step up it, never two.",
    visual: <ElevationVisual />,
  },
];

export default function HomePage() {
  const m = measure();

  return (
    <div className="flex flex-col">
      <header className={`${BAND} pt-12 pb-12 lg:pt-14`}>
        <h1 className="m-0 text-4xl text-foreground leading-heading tracking-display sm:text-5xl">
          {SITE_NAME} System
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-lg text-neutral-11 sm:text-xl">
          Tokens, components and design languages for building {brand.name} products — each one
          rendered here from the package itself.
        </p>
      </header>

      {/* The signature, given the room a signature needs: every language as a
          tile, one press re-skins the site. The grid below is live, so the
          press is answered on the same screen. */}
      <section
        aria-labelledby="languages-heading"
        className={`${BAND} flex flex-col gap-6 border-border border-t py-10`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2
            className="m-0 font-sans font-medium text-base text-foreground"
            id="languages-heading"
          >
            One switch, the whole language
          </h2>
          <p className="m-0 flex items-center gap-1.5 text-muted-foreground text-sm">
            {m.live} of {m.dimensions} dimensions move · press <Kbd small>L</Kbd> anywhere
          </p>
        </div>
        <LanguageGallery />
      </section>

      <section
        aria-label="Foundations"
        className="-mx-4 md:-mx-8 lg:-mx-12 grid gap-px border-border border-y bg-border sm:grid-cols-2"
      >
        {CELLS.map((cell) => (
          <div className="group relative flex flex-col bg-background" key={cell.href}>
            {cell.stat ? (
              <p className="absolute top-5 right-6 m-0 text-muted-foreground text-xs tabular-nums">
                {cell.stat(m)}
              </p>
            ) : null}
            <div className="flex min-h-52 items-center justify-center px-8 pt-10 pb-2">
              {cell.visual}
            </div>
            <div className="flex flex-col gap-1 px-8 pt-6 pb-8">
              {/* The title is the link; its box is stretched over the whole
                  cell, so the cell clicks through without wrapping the
                  specimens (which hold controls) inside an anchor. */}
              <Link
                className="inline-flex items-center gap-1.5 font-medium text-base text-foreground no-underline after:absolute after:inset-0"
                href={cell.href}
              >
                {cell.title}
                <ArrowRight
                  aria-hidden
                  className="size-3.5 text-muted-foreground opacity-0 transition-[opacity,transform] duration-flow group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </Link>
              <p className="m-0 text-base text-neutral-11">{cell.body}</p>
            </div>
          </div>
        ))}
      </section>

      <p className={`${BAND} m-0 pt-8 text-muted-foreground text-sm`}>
        {m.readers.toLocaleString()} files across the product read the dimensions a language switch
        moves. No figure on this page is typed in — each is counted from the token source and the
        component barrels at build time.
      </p>
    </div>
  );
}
