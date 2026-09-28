import { AnimateIn } from "@nebutra/ui/components";

/** Eyebrow, title and lead that open every starter section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  level = 2,
  align = "center",
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  level?: 1 | 2;
  align?: "center" | "start";
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <AnimateIn preset="fadeUp">
      <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        <Heading
          id={id}
          className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl"
        >
          {title}
        </Heading>
        <p className="mt-4 text-pretty text-base text-muted-foreground md:text-lg">{lead}</p>
      </div>
    </AnimateIn>
  );
}
