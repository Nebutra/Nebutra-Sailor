"use client";

import { ArrowRight, Lightning, Sparkles, Users } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CofounderCard, type CofounderCardData } from "@/components/cofounder-match/cofounder-card";
import type { CompanyContext } from "@/lib/startup-os/company-context/model";
import {
  companyCategory,
  companyName,
  valueProposition,
} from "@/lib/startup-os/company-context/projection";

interface ProjectSummary {
  readonly arena?: string;
  readonly thesis?: string;
  readonly companyContext?: CompanyContext;
  readonly artifacts?: ReadonlyArray<unknown>;
}

type LoadState = "loading" | "ready" | "empty";

const STEPS = [
  {
    icon: Lightning,
    title: "Compile your company",
    body: "Your card is built from your Startup OS CompanyContext — thesis, arena, traction.",
  },
  {
    icon: Sparkles,
    title: "Get matched",
    body: "Ranked by complementarity — what a cofounder brings vs the gap in your OPC.",
  },
  {
    icon: Users,
    title: "Form the team",
    body: "Mutual interest opens a Cofounder Room; form the team and the company carries over.",
  },
] as const;

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
        if (!project?.companyContext) {
          if (!cancelled) setState("empty");
          return;
        }
        const count = project.artifacts?.length ?? 0;
        setCard({
          companyName: companyName(project.companyContext),
          arena: project.arena ?? "Startup",
          oneLiner: valueProposition(project.companyContext) || project.thesis || "",
          category: companyCategory(project.companyContext),
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
    <section className="relative overflow-hidden">
      {/* Ambient brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[320px] w-full max-w-2xl opacity-[0.12] blur-3xl"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="relative mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
        {/* Hero */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-6 bg-neutral-1/80 px-3 py-1.5 text-xs font-semibold text-neutral-11 backdrop-blur">
            <Users className="size-3.5 text-primary" aria-hidden="true" />
            OPC → Team
          </span>
          <h1
            className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
            style={{
              background: "hsl(var(--primary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Match your cofounder
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-10">
            Turn your one-person company into a team — matched with a complementary cofounder by
            your compiled company, not a résumé.
          </p>
          <div className="mt-6 flex items-center justify-center">
            <Link
              href={`/${locale}/cofounder/discover`}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "hsl(var(--primary))" }}
            >
              Enter Discover
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Showcase: your card */}

        <div className="mt-10 flex flex-col items-center gap-3">
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

        {/* How it works — 3 steps */}
        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div
                key={step.title}
                className="flex h-full flex-col gap-2 rounded-2xl border border-neutral-6 bg-neutral-1 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/15">
                    <StepIcon className="size-3.5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-9">Step {index + 1}</span>
                </div>
                <p className="text-sm font-semibold text-neutral-12">{step.title}</p>
                <p className="text-xs leading-5 text-neutral-10">{step.body}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-9">
          The cofounder pool is opt-in and opens in the matching release. This page previews how
          your company will appear.
        </p>
      </div>
    </section>
  );
}
