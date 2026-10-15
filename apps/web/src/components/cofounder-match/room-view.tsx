"use client";

import { ArrowRight, LockClosed, Sparkles, Users } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cofounderRoomQueryOptions } from "@/lib/queries/cofounder";
import { CofounderCard } from "./cofounder-card";

export function RoomView({ profileId }: { profileId: string }) {
  const tCopy = useTranslations("copy.cofounderMatchRoomView");
  const tc = useTranslations("copy.cofounderMatchRoomView");
  const roomQuery = useQuery(cofounderRoomQueryOptions(profileId));
  const match = roomQuery.data?.match ?? null;
  const access = roomQuery.data?.access ?? null;
  const state = roomQuery.isPending
    ? "loading"
    : roomQuery.isError
      ? "error"
      : roomQuery.data === null
        ? "not-match"
        : "ready";

  const formTeamMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cofounder/room/${profileId}/form-team`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to form the team (${res.status})`);
    },
  });
  const formState = formTeamMutation.isPending
    ? "forming"
    : formTeamMutation.isSuccess
      ? "formed"
      : formTeamMutation.isError
        ? "error"
        : "idle";
  const formTeam = () => formTeamMutation.mutate();

  if (state === "loading") {
    return (
      <div className="mx-auto h-80 w-full max-w-sm animate-pulse rounded-[28px] border border-neutral-6 bg-neutral-2" />
    );
  }

  if (state === "not-match") {
    return (
      <EmptyState
        title={tc("thisIsnTA")}
        description={tc("theCofounderRoomOpens")}
        action={
          <Link
            href={`/cofounder/discover`}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground"
          >
            {tc("discoverCofounders")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  if (state === "error" || !match || !access) {
    return <EmptyState title={tc("couldnTOpenThe")} description={tc("somethingWentWrongPlease")} />;
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <CofounderCard data={match} />

      {access.granted ? (
        <div className="w-full max-w-md rounded-2xl border border-neutral-6 bg-neutral-1 p-5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary dark:bg-primary/15">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {tc("roomOpen")}
          </span>
          <p className="mt-3 text-sm font-semibold text-neutral-12">{tc("youBothWantTo")}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-10">{tc("formingTheTeamTurns")}</p>
          {formState === "formed" ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-success-strong">
              <Sparkles className="size-4" aria-hidden="true" />
              {tc("teamFormingInvitationSent")}
            </div>
          ) : (
            <Button
              type="button"
              shape="pill"
              className="mt-4"
              onClick={formTeam}
              disabled={formState === "forming"}
              prefix={<Users className="size-4" aria-hidden="true" />}
            >
              {formState === "forming" ? "Forming…" : tCopy("formTheTeam")}
            </Button>
          )}
          {formState === "error" ? (
            <p className="mt-2 text-xs text-destructive-strong">{tc("couldnTFormThe")}</p>
          ) : null}
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center dark:bg-primary/15">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-1/85 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur">
            <LockClosed className="size-3.5" aria-hidden="true" />
            {tc("paidPlanRequired")}
          </span>
          <p className="mt-3 text-sm font-semibold text-neutral-12">{tc("openTheCofounderRoom")}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-10">{tc("asTheFounderOpening")}</p>
          <Link
            href={`/choose-plan`}
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground"
          >
            {tc("upgradeToOpenThe")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
