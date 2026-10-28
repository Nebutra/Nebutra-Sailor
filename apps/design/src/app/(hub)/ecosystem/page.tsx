import type { Metadata } from "next";
import { EcosystemCard, StatusBadge } from "@/components/ecosystem-card";
import { type Audience, ECOSYSTEM, type EcosystemStatus, STATUS_LABEL } from "@/lib/ecosystem";
import { SITE_NAME } from "@/lib/site";
import { PageHeader, Section } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Ecosystem",
  description: `The tools and surfaces around ${SITE_NAME}, each marked live, beta or planned.`,
};

const MEANING: Record<EcosystemStatus, string> = {
  live: "Use it today from its link.",
  beta: "It exists and is changing. Expect rough edges.",
  planned: "Not built. Listed so you can see where this is going; there is nothing to link to yet.",
};

const AUDIENCES: ReadonlyArray<{ id: Audience; title: string; note: string }> = [
  {
    id: "design",
    title: "For designers",
    note: "Choose a look, build a palette, check motion and find an icon.",
  },
  {
    id: "develop",
    title: "For engineers",
    note: "The packages, the registry and the data behind adoption.",
  },
  {
    id: "agent",
    title: "For agents",
    note: "Machine-readable indexes and the skills that teach a coding agent the stack.",
  },
];

export default function EcosystemPage() {
  const count = (status: EcosystemStatus) =>
    ECOSYSTEM.filter((item) => item.status === status).length;

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="/ecosystem" title="Ecosystem">
        <p>
          The library is one piece of a set. Here is everything around it and exactly how finished
          each piece is: {count("live")} live, {count("beta")} in beta and {count("planned")}{" "}
          planned.
        </p>
      </PageHeader>

      <Section title="What the labels mean">
        <dl className="m-0 grid gap-x-8 gap-y-6 sm:grid-cols-3">
          {(["live", "beta", "planned"] as const).map((status) => (
            <div className="flex flex-col gap-2 border-border border-t pt-4" key={status}>
              <dt className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-muted-foreground text-xs tabular-nums">
                  {count(status)} of {ECOSYSTEM.length}
                </span>
              </dt>
              <dd className="m-0 text-neutral-11 text-sm">{MEANING[status]}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {AUDIENCES.map((audience) => {
        const items = ECOSYSTEM.filter((item) => item.audience[0] === audience.id);
        return (
          <Section key={audience.id} note={<p>{audience.note}</p>} title={audience.title}>
            {/* Left and top rules here, right and bottom on each cell: a short last row leaves clean space, not a filled-in grey slot. */}
            <div className="grid border-border border-t border-s sm:grid-cols-2 lg:grid-cols-3 [&>*]:border-border [&>*]:border-e [&>*]:border-b">
              {items.map((item) => (
                <EcosystemCard item={item} key={item.id} showBasis />
              ))}
            </div>
          </Section>
        );
      })}

      <p className="m-0 max-w-3xl border-border border-t py-8 text-muted-foreground text-sm">
        Statuses are edited by hand in one file and each carries the reason it holds. A{" "}
        {STATUS_LABEL.planned.toLowerCase()} item never has a link.
      </p>
    </div>
  );
}
