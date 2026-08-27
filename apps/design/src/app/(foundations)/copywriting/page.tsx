import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EASTER_EGG_REGISTRY, MILESTONE_COPY_PACK } from "@nebutra/brand/microcopy";
import type { Metadata } from "next";
import { Mono, PageHeader, Section } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Copywriting — foundations",
  description:
    "The milestone copy pack and the prohibitions, both read from source — the strings the product ships and the patterns lint refuses.",
};

/**
 * Voice, as the two things about it that are checkable.
 *
 * A copywriting page usually describes a tone and gives three examples somebody
 * wrote for the page. Both halves rot: the tone is unfalsifiable and the
 * examples were never shipped.
 *
 * Two parts of this system are neither. The milestone pack is the actual strings
 * the product renders at each moment in a user's arc, typed and bilingual, and
 * the prohibitions are regexes `pnpm lint` runs against every governed file. So
 * this page reads both from source: the copy below is what users see, and the
 * banned patterns below that are what fails CI — not a style guide's opinion
 * about them.
 *
 * What is deliberately absent is the half that cannot be mechanised. The
 * microcopy bible carries prohibitions about empty motivational copy and
 * self-congratulation that no regex can settle; those live in human review, and
 * claiming them here would imply a check that does not exist.
 */

interface BannedPattern {
  pattern: string;
  label: string;
}

function bannedPatterns(): BannedPattern[] {
  try {
    const raw = readFileSync(join(process.cwd(), "..", "..", "governance.config.json"), "utf8");
    const config = JSON.parse(raw) as {
      microcopyRules?: { bannedPatterns?: BannedPattern[]; allowlist?: unknown[] };
    };
    return config.microcopyRules?.bannedPatterns ?? [];
  } catch {
    return [];
  }
}

export default function CopywritingPage() {
  const milestones = Object.values(MILESTONE_COPY_PACK);
  const banned = bannedPatterns();
  const eggs = Object.values(EASTER_EGG_REGISTRY);

  return (
    <div>
      <PageHeader eyebrow="foundations / copywriting" title="Copywriting">
        <p>
          Two halves of the voice are mechanically checkable, and this page reads both from source:
          the strings the product actually renders, and the patterns <Mono>pnpm lint</Mono> refuses.
          The rest of the writing system — the prohibitions about empty motivational copy and
          self-congratulation — lives in human review, and is left off this page rather than
          implying a check that does not exist.
        </p>
      </PageHeader>

      <Section
        note={
          <p>
            {milestones.length} moments in a user&apos;s arc, each with the line the product shows
            at it. Bilingual, typed, and imported by the surfaces that render them — so the copy
            here is the copy that ships.
          </p>
        }
        title="Milestone pack"
      >
        <div className="flex flex-col gap-2">
          {milestones.map((entry) => (
            <div
              className="flex flex-col gap-1 rounded-[var(--radius-lg)] bg-card px-5 py-4 shadow-ambient-sm"
              key={entry.id}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="text-[15px] text-foreground">
                  {entry.copy["zh-CN"]?.primary ?? entry.copy["en-US"]?.primary}
                </span>
                <Mono>{entry.id}</Mono>
              </div>
              {entry.copy["en-US"]?.primary ? (
                <span className="text-[13px] text-muted-foreground">
                  {entry.copy["en-US"].primary}
                </span>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[entry.act, entry.stage, entry.voiceRegister, entry.culturalMotif].map((tag) => (
                  <span
                    className="rounded-[var(--radius-sm)] bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    key={`${entry.id}-${tag}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        note={
          <p>
            Read from <Mono>governance.config.json</Mono>, which is the file the lint rule reads.
            These are not examples of things to avoid — they are the expressions that fail the
            build.
          </p>
        }
        title="What lint refuses"
      >
        {banned.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No banned patterns are configured — <Mono>governance.config.json</Mono> is not readable
            from this build.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {banned.map((rule) => (
              <div
                className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-muted/60 px-4 py-3"
                key={rule.pattern}
              >
                <span className="text-[13px] text-foreground">{rule.label}</span>
                <code className="font-mono text-[11px] text-muted-foreground">{rule.pattern}</code>
              </div>
            ))}
          </div>
        )}
      </Section>

      {eggs.length > 0 ? (
        <Section
          note={
            <p>
              The registry exists so the rate can be governed rather than guessed. A reference the
              reader does not catch has to still read as an ordinary sentence — that is the
              condition on all of them.
            </p>
          }
          title="Easter eggs"
        >
          <div className="flex flex-col gap-2">
            {eggs.map((egg) => (
              <div
                className="flex flex-col gap-1 rounded-[var(--radius-lg)] bg-card px-5 py-4 shadow-ambient-sm"
                key={egg.id}
              >
                <span className="text-[15px] text-foreground">{egg.primaryCopy}</span>
                <span className="text-[13px] text-muted-foreground">{egg.secondaryCopy}</span>
                <Mono>
                  {egg.id} · {egg.layer}
                </Mono>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
