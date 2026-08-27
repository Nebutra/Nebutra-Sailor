import type { Metadata } from "next";
import { ModalitySpecimens } from "@/components/modality-specimens";
import { verifyCast } from "@/lib/patterns";
import { Mono, PageHeader, Section } from "../../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Modality — patterns",
  description:
    "Which overlay surface to reach for, with all four open-able side by side, and the cast checked against what the library actually exports.",
};

/**
 * The first migrated pattern, and the shape the rest should follow.
 *
 * A pattern is the one thing on this site that cannot be derived: which surface
 * to reach for is a judgement somebody made, and reading source does not
 * recover it. So the decision table below is hand-written, as it has to be.
 *
 * What is not hand-written is the cast. The same page in design-docs still
 * documents `Flash`, `IconButton` and `TextInput` — removed along with
 * @primer/react and gone for a long time. Prose about a component that no
 * longer exists is worse than no prose: it sends a reader after an import that
 * cannot resolve, and nothing in that app was ever going to notice. Here the
 * names are checked against the barrels at build time, so the editorial half
 * stays editorial and the factual half cannot rot.
 */

const SURFACES = [
  {
    name: "Dialog",
    use: "A compact decision the user must make before continuing — confirm, discard, delete.",
    not: "Anything that scrolls. If it needs to scroll it is a Sheet.",
  },
  {
    name: "Sheet",
    use: "A form or detail panel that slides in from an edge and may scroll.",
    not: "A one-line confirmation, which a Dialog states more directly.",
  },
  {
    name: "Drawer",
    use: "An edge-attached, draggable surface — the phone-first sibling of Sheet.",
    not: "Desktop-primary flows, where a Sheet reads as intentional and a Drawer as mobile.",
  },
  {
    name: "Popover",
    use: "Contextual detail anchored to its trigger, without blocking the page.",
    not: "Anything the user must answer. A non-blocking surface cannot demand a response.",
  },
] as const;

/** Names the design-docs version of this page documents. */
const LEGACY_CAST = ["Dialog", "Sheet", "Drawer", "Popover", "Flash", "IconButton", "TextInput"];

export default function ModalityPage() {
  const cast = verifyCast(LEGACY_CAST);
  const gone = cast.filter((entry) => !entry.exists);

  return (
    <div>
      <PageHeader eyebrow="patterns / modality" title="Modality">
        <p>
          Four surfaces interrupt the page to different degrees. The table says which to reach for;
          the specimens below it open, because the difference between a Sheet and a Dialog is one
          you settle by opening both rather than by reading about them.
        </p>
      </PageHeader>

      <Section title="The four surfaces">
        <ModalitySpecimens />
      </Section>

      <Section title="Which one">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase tracking-wide">
                <th className="pb-2 font-medium">Surface</th>
                <th className="pb-2 font-medium">Reach for it when</th>
                <th className="pb-2 font-medium">Not when</th>
              </tr>
            </thead>
            <tbody>
              {SURFACES.map((surface) => (
                <tr className="align-top" key={surface.name}>
                  <td className="py-3 pr-6">
                    <Mono>{surface.name}</Mono>
                  </td>
                  <td className="py-3 pr-6 text-foreground">{surface.use}</td>
                  <td className="py-3 text-muted-foreground">{surface.not}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        note={
          <p>
            Every component this pattern names, checked against the barrels at build time. A name
            that stops being exported turns red here on the next build instead of quietly misleading
            whoever reads the page next.
          </p>
        }
        title="Cast"
      >
        <ul className="flex flex-wrap gap-2">
          {cast.map((entry) => (
            <li
              className={`rounded-[var(--radius-md)] px-2.5 py-1 font-mono text-[12px] ${
                entry.exists
                  ? "bg-muted text-foreground"
                  : "bg-destructive/10 text-[hsl(var(--destructive-strong))] line-through"
              }`}
              key={entry.name}
            >
              {entry.name}
            </li>
          ))}
        </ul>
        {gone.length > 0 ? (
          <p className="mt-4 max-w-2xl text-[13px] text-muted-foreground leading-relaxed">
            {gone.length} of these are documented by the design-docs version of this page and are no
            longer exported by anything — they went with <Mono>@primer/react</Mono>. They are struck
            through rather than deleted so the removal is visible; the surfaces above are what the
            library actually offers.
          </p>
        ) : null}
      </Section>
    </div>
  );
}
