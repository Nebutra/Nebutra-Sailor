"use client";

import { ArrowRight, Sparkles } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cofounderMatchesQueryOptions } from "@/lib/queries/cofounder";
import { CofounderCard } from "./cofounder-card";

export function MatchesList() {
  const t = useTranslations("startupOs");
  const pathname = usePathname();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";
  const matchesQuery = useQuery(cofounderMatchesQueryOptions());
  const matches = matchesQuery.data ?? [];
  const state = matchesQuery.isPending
    ? "loading"
    : matchesQuery.isError
      ? "error"
      : matches.length > 0
        ? "ready"
        : "empty";

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
        title={t("errors.loadMatches")}
        description={t("errors.loadMatchesDescription")}
      />
    );
  }

  if (state === "empty") {
    return (
      <EmptyState
        title={t("emptyState.cofounders")}
        description={t("emptyState.cofoundersDescription")}
        action={
          <Link
            href={`/${locale}/cofounder/discover`}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground"
          >
            {t("emptyState.cofoundersAction")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {matches.map((match) => (
        <div key={match.profileId} className="flex flex-col items-center gap-3">
          <CofounderCard data={match} />
          <Link
            href={`/${locale}/cofounder/room/${match.profileId}`}
            className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Open Cofounder Room
          </Link>
        </div>
      ))}
    </div>
  );
}
