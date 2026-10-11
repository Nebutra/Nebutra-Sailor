/**
 * Title and lead that open every starter section — one heading size for every
 * section, no label above it. The face and weight come from the project's look
 * (the heading rule in @nebutra/tokens), so a Sailor Studio preset retunes them.
 * Static on purpose: what moves on this page is the hero headline and the
 * groups of cards, not every heading (Landing Motion System).
 */
export function SectionHeading({
  id,
  title,
  lead,
  level = 2,
  align = "center",
}: {
  id: string;
  title: string;
  lead: string;
  level?: 1 | 2;
  align?: "center" | "start";
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <Heading
        id={id}
        className="font-heading text-balance text-3xl tracking-tight text-foreground [font-weight:var(--font-weight-heading,500)] md:text-5xl"
      >
        {title}
      </Heading>
      <p className="mt-4 text-pretty text-base text-muted-foreground md:text-lg">{lead}</p>
    </div>
  );
}
