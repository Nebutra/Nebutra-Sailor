// @brand-exempt: design-system documentation copy; it names the product in prose and carries no brand colour or domain literal.
import { Robot, Sparkles, Terminal } from "@nebutra/icons";
import { ButtonLink } from "@nebutra/ui/primitives";
import Link from "next/link";
import type * as React from "react";
import { CommandLine } from "@/components/command-line";
import { EcosystemCard } from "@/components/ecosystem-card";
import { LanguageStrip, ProductScene } from "@/components/home-visuals";
import { ecosystemItem } from "@/lib/ecosystem";
import { REGISTRY_URL, SITE_NAME, SITE_ORIGIN, STUDIO_URL } from "@/lib/site";
import { measure } from "@/lib/site-stats";
import { BAND } from "./(tokens)/tokens/_components/primitives";

/**
 * The front door, in the order a visitor decides things: what is this (a real
 * product, built from the library, that you can re-skin), which of these are
 * you (three doors), what else is there (the ecosystem, with its state), and
 * how much is behind it (counted at build time, never typed).
 */

const HOME_ECOSYSTEM = ["studio", "palette", "icons", "blocks", "motion-lab", "adoption"] as const;

function Door({
  icon,
  title,
  lead,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 bg-background p-6 sm:p-8">
      <div className="flex items-center gap-2.5 text-foreground">
        {icon}
        <h3 className="m-0 font-sans font-medium text-base">{title}</h3>
      </div>
      <p className="m-0 text-neutral-11 text-sm">{lead}</p>
      <div className="mt-auto flex flex-col gap-2 pt-2">{children}</div>
    </div>
  );
}

const TEXT_LINK =
  "inline-flex items-center gap-1 text-foreground text-sm underline decoration-border underline-offset-4 transition-colors duration-micro hover:decoration-foreground";

export default function HomePage() {
  const m = measure();

  const stats: ReadonlyArray<{ value: string; label: string }> = [
    { value: `${m.covered}`, label: `of ${m.exports} exports documented` },
    { value: `${m.catalogStable}`, label: `stable of ${m.catalog} catalog components` },
    { value: `${m.tokens}`, label: "design tokens per mode" },
    { value: `${m.icons}`, label: "icons in @nebutra/icons" },
    { value: `${m.languages}`, label: "design languages" },
    {
      value: m.contrastFailures === 0 ? "0" : `${m.contrastFailures}`,
      label: "colour pairings below their contrast bar",
    },
  ];

  return (
    <div className="flex flex-col">
      <header className={`${BAND} pt-12 pb-10 lg:pt-16`}>
        <h1 className="m-0 max-w-3xl text-4xl text-foreground leading-heading tracking-display sm:text-5xl">
          {SITE_NAME}: tokens, components and design languages for building products that hold
          together.
        </h1>
        <p className="m-0 mt-5 max-w-2xl text-lg text-neutral-11">
          Everything on this site is rendered from the packages you install. Pick a language below
          and the whole page, product included, changes with it.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href="/develop" size="lg">
            Get started
          </ButtonLink>
          <ButtonLink href="/components" size="lg" variant="outline">
            Browse components
          </ButtonLink>
        </div>
      </header>

      <section
        aria-label="A Nebutra product in the active design language"
        className={`${BAND} flex flex-col gap-5 border-border border-t py-8`}
      >
        <LanguageStrip />
        <ProductScene />
      </section>

      <section
        aria-labelledby="doors-heading"
        className={`${BAND} flex flex-col gap-6 border-border border-t py-12`}
      >
        <h2
          className="m-0 text-2xl text-foreground leading-heading tracking-heading"
          id="doors-heading"
        >
          Start from what you do
        </h2>
        <div className="-mx-4 grid gap-px border-border border-y bg-border md:mx-0 md:grid-cols-3 md:border">
          <Door
            icon={<Sparkles aria-hidden className="size-4" />}
            lead="Choose a look, check colour and motion, then hand developers a preset instead of a spec."
            title="I design"
          >
            <a className={TEXT_LINK} href={STUDIO_URL} rel="noreferrer" target="_blank">
              Open Sailor Studio
            </a>
            <Link className={TEXT_LINK} href="/tokens">
              Read the foundations
            </Link>
            <Link className={TEXT_LINK} href="/palette">
              Try the Palette
            </Link>
          </Door>
          <Door
            icon={<Terminal aria-hidden className="size-4" />}
            lead="Add the library to an app, or scaffold a new one that already wears a language."
            title="I build"
          >
            <CommandLine command="pnpm add @nebutra/ui" />
            <CommandLine command="npx create-sailor@latest my-app --preset linear" />
            <Link className={TEXT_LINK} href="/develop">
              Install, import, and the three layers
            </Link>
          </Door>
          <Door
            icon={<Robot aria-hidden className="size-4" />}
            lead="Read the index, fetch an example, or hand the project a skill. A design-system MCP server is planned, not built."
            title="I use an agent"
          >
            <CommandLine command={`curl ${SITE_ORIGIN}/llms.txt`} />
            <a className={TEXT_LINK} href={REGISTRY_URL} rel="noreferrer" target="_blank">
              Component registry (JSON)
            </a>
            <Link className={TEXT_LINK} href="/ecosystem">
              Agent tools and their status
            </Link>
          </Door>
        </div>
      </section>

      <section
        aria-labelledby="ecosystem-heading"
        className={`${BAND} flex flex-col gap-6 border-border border-t py-12`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2
            className="m-0 text-2xl text-foreground leading-heading tracking-heading"
            id="ecosystem-heading"
          >
            Around the library
          </h2>
          <Link className={TEXT_LINK} href="/ecosystem">
            Everything, with status
          </Link>
        </div>
        <div className="-mx-4 grid gap-px border-border border-y bg-border sm:grid-cols-2 md:mx-0 md:border lg:grid-cols-3">
          {HOME_ECOSYSTEM.map((id) => (
            <EcosystemCard item={ecosystemItem(id)} key={id} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="numbers-heading"
        className={`${BAND} flex flex-col gap-6 border-border border-t py-12`}
      >
        <h2
          className="m-0 text-2xl text-foreground leading-heading tracking-heading"
          id="numbers-heading"
        >
          What is behind it
        </h2>
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <div className="flex flex-col gap-1.5 border-border border-t pt-4" key={stat.label}>
              <dt className="order-2 text-muted-foreground text-xs">{stat.label}</dt>
              <dd className="m-0 text-3xl text-foreground tabular-nums tracking-heading">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="m-0 max-w-2xl text-muted-foreground text-sm">
          Counted when the site is built, from the token source, the component barrels and the
          catalog. {m.readers.toLocaleString()} files across the products read the dimensions a
          language switch moves.
        </p>
      </section>
    </div>
  );
}
