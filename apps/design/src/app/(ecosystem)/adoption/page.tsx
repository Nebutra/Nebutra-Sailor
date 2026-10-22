import type { Metadata } from "next";
import {
  type AdoptionApp,
  AdoptionTable,
  type AdoptionTotals,
  bandOf,
  byAdoption,
  percent,
  RATIO_BANDS,
} from "@/components/adoption-table";
import report from "@/lib/generated/adoption.json";
import { Mono, Note, PageHeader, Section } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Adoption — ecosystem",
  description:
    "How much of every Nebutra app is built from the design system, counted from source at build time — including the apps that are not.",
};

/**
 * The public adoption board.
 *
 * Every figure here is read from `adoption.json`, which `scripts/adoption.mjs`
 * regenerates before each dev start and build. Nothing is typed into this file —
 * and the weak rows are shown as weak. A design system's adoption page that only
 * lists the flattering apps is a testimonial; this one is a measurement.
 */

const apps = report.apps as AdoptionApp[];
const totals = report.totals as AdoptionTotals;

const METRICS = [
  {
    name: ".tsx files",
    how: "Every .tsx file in the app, excluding vendored and generated directories, tests and stories.",
    why: "The denominator. Adoption is a share of the UI an app actually has.",
  },
  {
    name: "Import @nebutra/ui",
    how: "Files with a static, type-only, dynamic or re-export import of @nebutra/ui or any of its subpaths.",
    why: "The honest floor of adoption. A file can import the package and still hand-roll half its markup, but a file that does not import it cannot be using it.",
  },
  {
    name: "Hard-coded hex",
    how: "#rgb, #rgba, #rrggbb and #rrggbbaa literals in code. Comments and in-page #anchor links are not counted.",
    why: "A colour that bypasses the tokens will not follow a theme, a brand, or dark mode. Third-party brand marks (Slack, Linear) are counted too: the scan cannot tell them apart from drift.",
  },
  {
    name: "Arbitrary sizes",
    how: "Tailwind font sizes written as an arbitrary value in px, rem or em, with or without a variant prefix.",
    why: "A size outside the type scale. Many of them is a sign the scale is missing a step, not only that an app ignored it.",
  },
] as const;

export default function AdoptionPage() {
  const ranked = byAdoption(apps).filter((app) => app.uiRatio !== null);
  const weak = ranked.filter((app) => bandOf(app.uiRatio) === "weak");
  const noUi = ranked.filter((app) => app.uiFiles === 0);

  return (
    <div>
      <PageHeader eyebrow="ecosystem / adoption" title="Adoption">
        <p>
          {percent(totals.uiRatio)} of the {totals.tsxFiles.toLocaleString("en-US")} component files
          across {totals.apps} apps import <Mono>@nebutra/ui</Mono>. The{" "}
          {noUi.length > 0
            ? `${noUi.length} apps with none (${noUi.map((app) => app.name).join(", ")})`
            : "apps below"}{" "}
          are shown below, in the same table as the ones that lead.
        </p>
        <p>
          Counted from source by a script that runs before every build. If an app changes, this page
          changes with it.
        </p>
      </PageHeader>

      <Section
        note={
          <p>
            Sorted by share of files importing the package. The bar is green from{" "}
            {Math.round(RATIO_BANDS.strong * 100)}%, amber from{" "}
            {Math.round(RATIO_BANDS.partial * 100)}%, red below — editorial bands to make weak rows
            findable, not a standard.
            {weak.length > 0
              ? ` ${weak.length} of ${ranked.length} apps with UI sit in the red.`
              : null}
          </p>
        }
        title="By app"
      >
        <AdoptionTable apps={apps} totals={totals} />
      </Section>

      <Section
        note={
          <p>
            These are text scans, not a parse: stable and cheap, wrong the same way for every app.
            Read them as a ranking and a trend, not as an audit.
          </p>
        }
        title="What is counted"
      >
        <dl className="m-0 grid gap-x-8 gap-y-6 md:grid-cols-2">
          {METRICS.map((metric) => (
            <div className="min-w-0" key={metric.name}>
              <dt className="font-medium text-foreground">{metric.name}</dt>
              <dd className="m-0 mt-1 text-neutral-11 text-sm">{metric.how}</dd>
              <dd className="m-0 mt-1 text-muted-foreground text-sm">{metric.why}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Reproduce it">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="m-0 text-neutral-11 text-sm">
            The scan is <Mono>apps/design/scripts/adoption.mjs</Mono>, with tests against a fixture
            tree. It writes <Mono>src/lib/generated/adoption.json</Mono> and runs from{" "}
            <Mono>predev</Mono> and <Mono>prebuild</Mono>.
          </p>
          <pre className="m-0 overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-sm">
            <code>node apps/design/scripts/adoption.mjs</code>
          </pre>
          <Note>
            Excluded: {report.excluded.directories.join(", ")}; files ending{" "}
            {report.excluded.files.join(", ")}.
          </Note>
        </div>
      </Section>
    </div>
  );
}
