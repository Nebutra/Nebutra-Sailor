// @brand-exempt: design-system documentation copy; it names the product in prose and carries no brand colour or domain literal.
import { ArrowUpRight } from "@nebutra/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { EcosystemCard } from "@/components/ecosystem-card";
import { ecosystemItem } from "@/lib/ecosystem";
import { PATTERNS } from "@/lib/pattern-data";
import { LANDING_ORIGIN, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { measure } from "@/lib/site-stats";
import { aliases, failures, scales, semanticRoles } from "@/lib/tokens";
import { PageHeader, Section } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Design",
  description: `How ${SITE_NAME} products are meant to look and behave, and where to find the tokens, patterns and tools to design them.`,
};

const LINK_CELL =
  "group relative flex flex-col gap-1.5 bg-background p-5 transition-colors duration-micro has-[a]:hover:bg-card";
const CELL_TITLE =
  "inline-flex items-center gap-1.5 font-medium text-base text-foreground no-underline after:absolute after:inset-0";

const FOUNDATIONS = [
  {
    href: "/tokens/color",
    label: "Color",
    body: "Grayscale first, one blue for focus and selection.",
  },
  { href: "/tokens/type", label: "Type", body: "A display face, a text face and a code face." },
  {
    href: "/tokens/shape",
    label: "Shape",
    body: "Radii that a design language can change in one place.",
  },
  {
    href: "/tokens/elevation",
    label: "Elevation",
    body: "One shadow ramp; a hover moves one step up it.",
  },
  {
    href: "/tokens/motion",
    label: "Motion",
    body: "Durations and easings, and where each is used.",
  },
  { href: "/tokens/layers", label: "Layers", body: "What sits above what, and why." },
  {
    href: "/tokens/switchability",
    label: "Switchability",
    body: "Which dimensions a language switch moves.",
  },
  { href: "/tokens/traps", label: "Traps", body: "The mistakes that look right and are not." },
] as const;

/** Count of colour pairings below their contrast bar, measured in light mode. */
function contrastFailures(): number {
  return failures([
    ...semanticRoles("light"),
    ...scales("light").flatMap((scale) => scale.steps),
    ...aliases("light"),
  ]).length;
}

export default function DesignPage() {
  const m = measure();
  const failing = contrastFailures();

  const principles = [
    {
      title: "Quiet first, then one accent",
      body: "Surfaces and text are grayscale. One blue marks focus and selection and is used sparingly, so when it appears it means something.",
      href: "/tokens/color",
      proof: "Color",
    },
    {
      title: "A language is a switch, not a rewrite",
      body: `Components read semantic tokens, so changing the design language re-skins a product without touching it. ${m.live} of ${m.dimensions} dimensions move today.`,
      href: "/tokens/switchability",
      proof: "Switchability",
    },
    {
      title: "Contrast is measured, not promised",
      body:
        failing === 0
          ? "Every declared text and surface pairing is measured against its bar at build time, and none falls below it."
          : `Every declared pairing is measured at build time; ${failing} currently fall below their bar, and the accessibility page lists them.`,
      href: "/accessibility",
      proof: "Accessibility",
    },
    {
      title: "Motion explains a change",
      body: "Things move to show where they came from or went. Entrances share a few presets, and nothing moves just to be noticed.",
      href: "/tokens/motion",
      proof: "Motion",
    },
  ] as const;

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="/design" title="Design">
        <p>
          What a Nebutra product should look like and how it should behave, and the tokens, patterns
          and tools to get there. Each principle links to the page that measures it.
        </p>
      </PageHeader>

      <Section title="Principles">
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {principles.map((item) => (
            <div className={LINK_CELL} key={item.title}>
              <h3 className="m-0 font-sans font-medium text-base text-foreground">{item.title}</h3>
              <p className="m-0 text-neutral-11 text-sm">{item.body}</p>
              <Link className={`${CELL_TITLE} mt-2 text-muted-foreground text-sm`} href={item.href}>
                {item.proof}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section
        note={
          <p>
            The values behind every screen. Each page renders the tokens from the source files in
            both modes, so what you read is what ships.
          </p>
        }
        title="Foundations"
      >
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {FOUNDATIONS.map((item) => (
            <div className={LINK_CELL} key={item.href}>
              <Link className={CELL_TITLE} href={item.href}>
                {item.label}
              </Link>
              <p className="m-0 text-neutral-11 text-sm">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        note={
          <p>
            Composition decisions: which surface to open, how a form fails, what an empty state
            says. {PATTERNS.length} patterns, each naming the components it uses.
          </p>
        }
        title="Patterns"
      >
        <ul className="m-0 grid list-none gap-px overflow-hidden rounded-lg border border-border bg-border p-0 sm:grid-cols-2 lg:grid-cols-3">
          {PATTERNS.map((pattern) => (
            <li className={LINK_CELL} key={pattern.slug}>
              <Link className={CELL_TITLE} href={`/patterns/${pattern.slug}`}>
                {pattern.title}
              </Link>
              <p className="m-0 line-clamp-3 text-neutral-11 text-sm">
                {pattern.intro.split(/(?<=\.)\s/)[0]}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        note={
          <p>
            Tools for working on a look before it becomes code. Each one says how finished it is.
          </p>
        }
        title="Tools"
      >
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {(["studio", "palette", "motion-lab", "icons", "figma", "code-connect"] as const).map(
            (id) => (
              <EcosystemCard item={ecosystemItem(id)} key={id} />
            ),
          )}
        </div>
      </Section>

      <Section note={<p>Assets and references to take with you.</p>} title="Resources">
        <ul className="m-0 grid list-none gap-px overflow-hidden rounded-lg border border-border bg-border p-0 sm:grid-cols-2 lg:grid-cols-3">
          <li className={LINK_CELL}>
            <Link className={CELL_TITLE} href="/brand">
              Brand
            </Link>
            <p className="m-0 text-neutral-11 text-sm">
              The mark, the wordmark and the rules for placing them.
            </p>
          </li>
          <li className={LINK_CELL}>
            <Link className={CELL_TITLE} href="/copywriting">
              Copywriting
            </Link>
            <p className="m-0 text-neutral-11 text-sm">How product text is written.</p>
          </li>
          <li className={LINK_CELL}>
            <a className={CELL_TITLE} href={`${SITE_ORIGIN}/llms.txt`}>
              llms.txt
              <ArrowUpRight aria-hidden className="size-3.5 text-muted-foreground" />
            </a>
            <p className="m-0 text-neutral-11 text-sm">
              This site as one plain-text index, for tools and agents.
            </p>
          </li>
          <li className={LINK_CELL}>
            <a className={CELL_TITLE} href={LANDING_ORIGIN} rel="noreferrer" target="_blank">
              Nebutra
              <ArrowUpRight aria-hidden className="size-3.5 text-muted-foreground" />
            </a>
            <p className="m-0 text-neutral-11 text-sm">
              The company site, where these systems ship.
            </p>
          </li>
        </ul>
      </Section>
    </div>
  );
}
