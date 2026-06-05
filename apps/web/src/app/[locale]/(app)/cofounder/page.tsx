"use client";

import { ArrowRight, Sparkles, Users } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { EmptyState, PageHeader } from "@nebutra/ui/layout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CofounderCard, type CofounderCardData } from "@/components/cofounder-match/cofounder-card";

interface ProjectSummary {
  readonly arena?: string;
  readonly thesis?: string;
  readonly companyContext?: {
    readonly name?: string;
    readonly category?: string;
    readonly promise?: string;
  };
  readonly artifacts?: ReadonlyArray<unknown>;
}

type LoadState = "loading" | "ready" | "empty";

export default function CofounderPage() {
  const pathname = usePathname();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";
  const [state, setState] = useState<LoadState>("loading");
  const [card, setCard] = useState<CofounderCardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/startup-os/projects", { credentials: "include" });
        if (!res.ok || cancelled) {
          if (!cancelled) setState("empty");
          return;
        }
        const data = (await res.json()) as { projects?: ProjectSummary[] };
        const project = data.projects?.[0];
        if (!project?.companyContext?.name) {
          if (!cancelled) setState("empty");
          return;
        }
        const count = project.artifacts?.length ?? 0;
        setCard({
          companyName: project.companyContext.name,
          arena: project.arena ?? "Startup",
          oneLiner: project.companyContext.promise || project.thesis || "",
          category: project.companyContext.category,
          tractionLabel:
            count > 0 ? `${count} artifact${count === 1 ? "" : "s"} compiled` : undefined,
          trustVerified: true,
        });
        setState("ready");
      } catch {
        if (!cancelled) setState("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[var(--container-content)] px-5 py-8 sm:px-8">
      <PageHeader
        title="Match your cofounder"
        description="Turn your one-person company into a team — matched with a complementary cofounder by your compiled company, not a résumé."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
        {/* Value prop */}
        <AnimateIn preset="fadeUp">
          <div className="flex flex-col gap-4">
            {[
              {
                icon: Sparkles,
                title: "Matched on your compiled company",
                body: "Candidates are ranked by complementarity — what they bring vs the gap in your OPC — using your real CompanyContext, thesis, arena, and traction.",
              },
              {
                icon: Users,
                title: "Match → Cofounder Room → team",
                body: "Mutual interest opens a Cofounder Room. Form the team and your whole compiled company carries over — the OPC becomes an organization.",
              },
            ].map((row) => {
              const RowIcon = row.icon;
              return (
                <div
                  key={row.title}
                  className="flex gap-3 rounded-2xl border border-neutral-6 bg-neutral-1 p-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-3 dark:bg-blue-9/20">
                    <RowIcon className="size-4 text-blue-10" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-neutral-12">{row.title}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-10">{row.body}</p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-neutral-9">
              The cofounder pool is opt-in and opens in the matching release. This page previews how
              your company will appear.
            </p>
          </div>
        </AnimateIn>

        {/* Preview: how you'll appear */}
        <AnimateIn preset="emerge">
          <div className="flex flex-col items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-9">
              Preview · how cofounders see you
            </p>
            {state === "ready" && card ? (
              <CofounderCard data={card} preview />
            ) : state === "loading" ? (
              <div className="h-80 w-full max-w-sm animate-pulse rounded-[28px] border border-neutral-6 bg-neutral-2" />
            ) : (
              <EmptyState
                title="Compile your company first"
                description="Your cofounder card is built from your Startup OS company. Compile one to preview it."
                action={
                  <Link
                    href={`/${locale}/startup-os`}
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-12 px-4 py-2 text-sm font-semibold text-neutral-1 transition-colors hover:bg-neutral-11 dark:text-neutral-12"
                  >
                    Compile your company
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                }
              />
            )}
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
