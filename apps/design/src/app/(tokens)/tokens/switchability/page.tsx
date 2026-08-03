import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { Chip, Mono, Note, PageHeader, Panel, Section } from "../_components/primitives";

export const metadata: Metadata = {
  title: "Switchability",
  description:
    "Which design-language dimensions actually move a pixel when you flip the brand switcher — measured by the same guard CI runs, not typed by hand.",
};

type DimensionStatus = "live" | "known-inert" | "inert" | "undeclared";

interface SwitchabilityReport {
  generatedAt: string;
  source: string;
  knownInert: string[];
  dimensions: {
    id: string;
    declared: boolean;
    consumers: number;
    status: DimensionStatus;
  }[];
}

function loadReport(): SwitchabilityReport {
  const path = join(process.cwd(), "src/lib/generated/switchability.json");
  return JSON.parse(readFileSync(path, "utf-8")) as SwitchabilityReport;
}

const STATUS_LABEL: Record<DimensionStatus, string> = {
  live: "Live",
  "known-inert": "Known inert",
  inert: "Inert (bug)",
  undeclared: "Not declared",
};

const STATUS_TONE: Record<DimensionStatus, string> = {
  live: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  "known-inert": "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  inert: "bg-red-500/15 text-red-800 dark:text-red-300",
  undeclared: "bg-muted text-muted-foreground",
};

export default function SwitchabilityPage() {
  const report = loadReport();
  const live = report.dimensions.filter((d) => d.status === "live");
  const inert = report.dimensions.filter((d) => d.status === "known-inert" || d.status === "inert");
  const undeclared = report.dimensions.filter((d) => d.status === "undeclared");

  return (
    <div>
      <PageHeader eyebrow="Foundations" title="What actually switches">
        <p>
          Every Brand Package declares roughly two hundred custom properties. That number is only
          meaningful for the properties something actually consumes — a skin can override a dead
          variable forever without moving a pixel, and Tailwind will tree-shake the theme entry
          entirely.
        </p>
        <p>
          The table below is not documentation someone typed. It is the live output of{" "}
          <Mono>{report.source}</Mono>, the same guard CI runs. Generated{" "}
          <Mono>{new Date(report.generatedAt).toISOString().slice(0, 19)}Z</Mono>. Flip the language
          switcher in the header and watch the live components change — only the{" "}
          <strong className="font-medium text-foreground">Live</strong> rows move anything.
        </p>
      </PageHeader>

      <Section
        title="Scoreboard"
        note={
          <p>
            {live.length} live · {inert.length} inert · {undeclared.length} undeclared. Known-inert
            entries live in <Mono>governance.config.json → inertDimensions.known</Mono> and the list
            may only shrink.
          </p>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.dimensions.map((d) => (
            <Panel key={d.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground capitalize tracking-tight">
                  {d.id}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium text-[11px] ${STATUS_TONE[d.status]}`}
                >
                  {STATUS_LABEL[d.status]}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {d.status === "undeclared"
                  ? "No skin declares this dimension."
                  : d.consumers === 0
                    ? "Declared by every language; nothing reads it."
                    : `${d.consumers} consuming file${d.consumers === 1 ? "" : "s"}.`}
              </p>
              {d.status === "live" ? (
                <Chip tone="pass">{d.consumers} readers</Chip>
              ) : d.status === "known-inert" ? (
                <Chip tone="warn">allowlisted</Chip>
              ) : d.status === "undeclared" ? (
                <Chip tone="neutral">no emitters</Chip>
              ) : (
                <Chip tone="fail">inert</Chip>
              )}
            </Panel>
          ))}
        </div>
      </Section>

      <Section
        title="How to read this"
        note={
          <>
            <p>
              <strong className="font-medium text-foreground">
                colour / radius / motion / controls
              </strong>{" "}
              are the dimensions the header switcher is for. Change language and a Button&apos;s
              fill, corner radius, control height and duration all retarget — because those
              variables have real consumers in <Mono>packages/design/ui</Mono>.
            </p>
            <p>
              <strong className="font-medium text-foreground">spacing</strong> is live as{" "}
              <Mono>--space-source-*</Mono> (Brand Packages override it; playground reads it
              directly). It is not registered as <Mono>@theme --spacing-sm|md|…</Mono> — those keys
              hijack Tailwind <Mono>max-w-*</Mono> on the shared size rail.
            </p>
            <p>
              <strong className="font-medium text-foreground">zones</strong> is undeclared: the
              per-zone typography blocks were deleted once measured as zero-consumer. Do not revive
              them without a real reader.
            </p>
          </>
        }
      >
        <Note>
          Hand-writing these numbers into a markdown file is how they go stale. If the scoreboard
          looks wrong, re-run{" "}
          <Mono>
            node scripts/lint-inert-dimensions.mjs --write
            apps/design/src/lib/generated/switchability.json
          </Mono>
          — or just <Mono>pnpm --filter @nebutra/design dev</Mono>, which regenerates on predev.
        </Note>
      </Section>
    </div>
  );
}
