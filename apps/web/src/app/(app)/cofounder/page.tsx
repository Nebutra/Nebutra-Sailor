"use client";

import { ArrowRight, Lightning, Sparkles, Users } from "@nebutra/icons";
import { EmptyState, PageHeader } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
    key: "compile",
  },
  {
    icon: Sparkles,
    key: "match",
  },
  {
    icon: Users,
    key: "team",
  },
] as const;

export default function CofounderPage() {
  const tc = useTranslations("copy.cofounderPage");
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
    <section className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={tc("matchYourCofounder")}
        description={tc("turnYourOnePerson")}
        actions={
          <Button asChild size="sm">
            <Link href="/cofounder/discover">
              {tc("enterDiscover")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <div>
        {/* Showcase: your card */}

        <div className="flex flex-col items-center gap-3">
          <p className="self-start text-sm font-semibold text-neutral-12">
            {tc("previewHowCofoundersSee")}
          </p>
          {state === "ready" && card ? (
            <CofounderCard data={card} preview />
          ) : state === "loading" ? (
            <div className="h-80 w-full max-w-sm animate-pulse rounded-[28px] border border-neutral-6 bg-neutral-2" />
          ) : (
            <EmptyState
              preview="metrics"
              title={tc("compileYourCompanyFirst")}
              description={tc("yourCofounderCardIs")}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/startup-os">
                    {tc("compileYourCompany")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
          )}
        </div>

        {/* How it works — 3 steps */}
        <div className="mt-12 grid overflow-hidden rounded-xl border border-border sm:grid-cols-3 sm:divide-x sm:divide-border max-sm:divide-y max-sm:divide-border">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex h-full flex-col gap-2 p-5">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/15">
                    <StepIcon className="size-3.5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="text-xs text-neutral-10">
                    {tc("step", { value0: String(index + 1) })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-neutral-12">
                  {tc(`steps.${step.key}.title`)}
                </p>
                <p className="text-xs leading-5 text-neutral-10">{tc(`steps.${step.key}.body`)}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-neutral-11">{tc("theCofounderPoolIs")}</p>
      </div>
    </section>
  );
}
