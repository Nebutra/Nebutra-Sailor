"use client";

import { ArrowRight, Sparkles } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { EmptyState } from "@nebutra/ui/layout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CofounderCard, type CofounderCardData } from "./cofounder-card";

interface MatchEntry extends CofounderCardData {
  readonly profileId: string;
}

type LoadState = "loading" | "ready" | "empty" | "error";

export function MatchesList() {
  const pathname = usePathname();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";
  const [state, setState] = useState<LoadState>("loading");
  const [matches, setMatches] = useState<MatchEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/cofounder/matches", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setState("error");
          return;
        }
        const data = (await res.json()) as { matches?: MatchEntry[] };
        const next = data.matches ?? [];
        if (cancelled) return;
        setMatches(next);
        setState(next.length > 0 ? "ready" : "empty");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="h-80 animate-pulse rounded-[28px] border border-neutral-6 bg-neutral-2" />
        <div className="h-80 animate-pulse rounded-[28px] border border-neutral-6 bg-neutral-2" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <EmptyState
        title="Couldn't load your matches"
        description="Something went wrong. Please refresh to try again."
      />
    );
  }

  if (state === "empty") {
    return (
      <EmptyState
        title="No matches yet"
        description="When you and another founder both signal interest, they appear here — and you can open the Cofounder Room."
        action={
          <Link
            href={`/${locale}/cofounder/discover`}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            Discover cofounders
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  return (
    <AnimateInGroup stagger="normal" className="grid gap-5 sm:grid-cols-2">
      {matches.map((match) => (
        <AnimateIn key={match.profileId} preset="fadeUp">
          <div className="flex flex-col items-center gap-3">
            <CofounderCard data={match} />
            <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-full border border-blue-7 bg-blue-2 px-4 py-2.5 text-sm font-semibold text-blue-11 dark:bg-blue-9/20">
              <Sparkles className="size-4" aria-hidden="true" />
              Mutual match — Cofounder Room opens next
            </div>
          </div>
        </AnimateIn>
      ))}
    </AnimateInGroup>
  );
}
