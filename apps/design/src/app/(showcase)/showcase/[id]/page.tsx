import { ArrowLeft } from "@nebutra/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShowcaseDemoView } from "@/components/showcase-demo-view";
import { GraduationChecklist } from "@/components/showcase-graduation";
import { StatusBadge, TIER_TITLE } from "@/components/showcase-status";
import { blockedFor, showcaseItem, showcaseItems } from "@/lib/showcase";
import { readDemoSource } from "@/lib/showcase-source";
import { SITE_NAME } from "@/lib/site";

/**
 * Prerendered like the component pages: `readDemoSource` touches the filesystem,
 * so there is no dynamic request API here on purpose.
 */

export function generateStaticParams() {
  return showcaseItems().map((item) => ({ id: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = showcaseItem(id);
  if (!item) return {};
  return { title: `${item.title} — Showcase — ${SITE_NAME}` };
}

export default async function ShowcaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = showcaseItem(id);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-10 pb-8">
      <header className="flex flex-col gap-4 pt-10">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
          href={`/showcase?tier=${item.tier}`}
        >
          <ArrowLeft aria-hidden="true" size={14} />
          Showcase · {TIER_TITLE[item.tier]}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl text-foreground tracking-display [font-weight:var(--font-weight-heading,600)]">
            {item.title}
          </h1>
          <StatusBadge status={item.status} />
        </div>
        <p className="font-mono text-muted-foreground text-sm">
          {item.import} · {item.category}
        </p>
        {item.status === "lab" ? (
          <p className="max-w-2xl text-neutral-11 text-sm">
            This is in the Lab: it has not met the bar for Expressive, so it is shown for judging,
            not for shipping. The catalog lists it as {item.catalogStatus}.
          </p>
        ) : null}
      </header>

      {item.audit && item.status === "lab" ? (
        <section className="flex max-w-2xl flex-col gap-3" id="graduation">
          <h2 className="font-medium text-foreground text-lg">What it needs to graduate</h2>
          <GraduationChecklist audit={item.audit} />
        </section>
      ) : null}

      <section className="flex flex-col gap-6" id="demos">
        <h2 className="font-medium text-foreground text-lg">
          {item.variants > 1 ? `${item.variants} demos` : "Demo"}
        </h2>
        {item.demos.map((demoId) => (
          <ShowcaseDemoView
            blockedReason={
              blockedFor(demoId)?.kind === "global" ? (blockedFor(demoId)?.reason ?? null) : null
            }
            code={readDemoSource(demoId)}
            id={demoId}
            key={demoId}
          />
        ))}
      </section>
    </div>
  );
}
