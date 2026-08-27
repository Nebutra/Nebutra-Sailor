"use client";

import { ArrowRight, LockClosed, Sparkles, Users } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CofounderCard, type CofounderCardData } from "./cofounder-card";

interface RoomMatch extends CofounderCardData {
  readonly profileId: string;
}

interface RoomAccess {
  readonly granted: boolean;
  readonly planName: string | null;
  readonly status: string;
}

type LoadState = "loading" | "ready" | "not-match" | "error";

export function RoomView({ profileId }: { profileId: string }) {
  const pathname = usePathname();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";
  const [state, setState] = useState<LoadState>("loading");
  const [match, setMatch] = useState<RoomMatch | null>(null);
  const [access, setAccess] = useState<RoomAccess | null>(null);
  const [formState, setFormState] = useState<"idle" | "forming" | "formed" | "error">("idle");

  const formTeam = useCallback(async () => {
    setFormState("forming");
    try {
      const res = await fetch(`/api/cofounder/room/${profileId}/form-team`, {
        method: "POST",
        credentials: "include",
      });
      setFormState(res.ok ? "formed" : "error");
    } catch {
      setFormState("error");
    }
  }, [profileId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/cofounder/room/${profileId}`, { credentials: "include" });
        if (res.status === 404) {
          if (!cancelled) setState("not-match");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setState("error");
          return;
        }
        const data = (await res.json()) as { match: RoomMatch; access: RoomAccess };
        if (cancelled) return;
        setMatch(data.match);
        setAccess(data.access);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (state === "loading") {
    return (
      <div className="mx-auto h-80 w-full max-w-sm animate-pulse rounded-[28px] border border-neutral-6 bg-neutral-2" />
    );
  }

  if (state === "not-match") {
    return (
      <EmptyState
        title="This isn't a match yet"
        description="The Cofounder Room opens only for mutual matches. Keep discovering — when you both signal interest, the room unlocks here."
        action={
          <Link
            href={`/${locale}/cofounder/discover`}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "hsl(var(--primary))" }}
          >
            Discover cofounders
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  if (state === "error" || !match || !access) {
    return (
      <EmptyState
        title="Couldn't open the room"
        description="Something went wrong. Please refresh to try again."
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <CofounderCard data={match} />

      {access.granted ? (
        <div className="w-full max-w-md rounded-2xl border border-neutral-6 bg-neutral-1 p-5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary dark:bg-primary/15">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Room open
          </span>
          <p className="mt-3 text-sm font-semibold text-neutral-12">
            You both want to build together.
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-10">
            Forming the team turns your one-person company into a shared Organization — your whole
            compiled company carries over and your cofounder is invited as an equal founder.
          </p>
          {formState === "formed" ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-[hsl(var(--success-strong))]">
              <Sparkles className="size-4" aria-hidden="true" />
              Team forming — invitation sent
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
              {formState === "forming" ? "Forming…" : "Form the team"}
            </Button>
          )}
          {formState === "error" ? (
            <p className="mt-2 text-xs text-[color:var(--status-danger)]">
              Couldn't form the team. Please try again.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center dark:bg-primary/15">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-1/85 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur">
            <LockClosed className="size-3.5" aria-hidden="true" />
            Paid plan required
          </span>
          <p className="mt-3 text-sm font-semibold text-neutral-12">
            Open the Cofounder Room with a paid plan
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-10">
            As the founder opening the room, a paid plan unlocks the conversation with every match —
            no per-room fee.
          </p>
          <Link
            href={`/${locale}/choose-plan`}
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "hsl(var(--primary))" }}
          >
            Upgrade to open the room
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
