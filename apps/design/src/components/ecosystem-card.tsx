import { ArrowUpRight } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import Link from "next/link";
import { type EcosystemItem, type EcosystemStatus, STATUS_LABEL } from "@/lib/ecosystem";

const STATUS_VARIANT = {
  live: "green-subtle",
  beta: "beta",
  planned: "coming-soon",
} as const satisfies Record<EcosystemStatus, string>;

/** One word, one colour: the state of a piece of the ecosystem, never decoration. */
export function StatusBadge({ status }: { status: EcosystemStatus }) {
  return (
    <Badge size="sm" variant={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/**
 * A cell in the ecosystem grid. When the piece has somewhere to go, the title
 * is the link and its box stretches over the whole cell; a planned piece has no
 * link and no arrow, so nothing in it reads as a destination.
 */
export function EcosystemCard({
  item,
  showBasis = false,
}: {
  item: EcosystemItem;
  showBasis?: boolean;
}) {
  const title = (
    <>
      {item.name}
      {item.external ? (
        <ArrowUpRight aria-hidden className="size-3.5 text-muted-foreground" />
      ) : null}
    </>
  );
  const titleClass =
    "inline-flex items-center gap-1.5 font-medium text-base text-foreground no-underline after:absolute after:inset-0";

  return (
    <div className="group relative flex flex-col gap-3 bg-background p-6 transition-colors duration-micro has-[a]:hover:bg-card">
      <div className="flex items-start justify-between gap-3">
        {item.href ? (
          item.external ? (
            <a className={titleClass} href={item.href} rel="noreferrer" target="_blank">
              {title}
            </a>
          ) : (
            <Link className={titleClass} href={item.href}>
              {title}
            </Link>
          )
        ) : (
          <p className="m-0 font-medium text-base text-foreground">{item.name}</p>
        )}
        <StatusBadge status={item.status} />
      </div>
      <p className="m-0 text-neutral-11 text-sm">{item.summary}</p>
      {showBasis ? <p className="m-0 text-muted-foreground text-xs">{item.basis}</p> : null}
    </div>
  );
}
