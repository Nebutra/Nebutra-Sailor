"use client";

import { ArrowRight, Cross, Heart, PaperAirplane, Sparkles } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { EmptyState } from "@nebutra/ui/layout";
import { Textarea } from "@nebutra/ui/primitives";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CofounderCard, type CofounderCardData } from "./cofounder-card";

interface DiscoverCard extends CofounderCardData {
  readonly profileId: string;
}

type DeckState =
  | "loading"
  | "needs-optin"
  | "needs-company"
  | "active"
  | "empty"
  | "error";

type InterestKind = "PASS" | "INTERESTED" | "PITCH";

const PITCH_MAX = 1000;

export function DiscoverDeck() {
  const pathname = usePathname();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";

  const [state, setState] = useState<DeckState>("loading");
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pitchMode, setPitchMode] = useState(false);
  const [pitch, setPitch] = useState("");
  const [matched, setMatched] = useState<DiscoverCard | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/cofounder/discover", { credentials: "include" });
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = (await res.json()) as { cards?: DiscoverCard[]; reason?: string };
      if (data.reason === "not-opted-in") {
        setState("needs-optin");
        return;
      }
      const next = data.cards ?? [];
      setCards(next);
      setIndex(0);
      setState(next.length > 0 ? "active" : "empty");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const joinPool = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cofounder/opt-in", { method: "POST", credentials: "include" });
      if (res.status === 409) {
        setState("needs-company");
        return;
      }
      if (res.ok) {
        await load();
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const current = cards[index];

  const act = useCallback(
    async (kind: InterestKind, pitchText?: string) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        const res = await fetch("/api/cofounder/interest", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ toProfileId: current.profileId, kind, pitch: pitchText }),
        });
        if (res.ok) {
          const data = (await res.json()) as { matched?: boolean };
          if (data.matched) setMatched(current);
        }
      } catch {
        // Non-fatal: advancing past a failed signal is better UX than blocking the deck.
      } finally {
        const nextIndex = index + 1;
        setIndex(nextIndex);
        setPitchMode(false);
        setPitch("");
        setBusy(false);
        if (nextIndex >= cards.length) setState("empty");
      }
    },
    [busy, cards.length, current, index],
  );

  if (state === "loading") {
    return <div className="mx-auto h-80 w-full max-w-sm animate-pulse rounded-[28px] border border-neutral-6 bg-neutral-2" />;
  }

  if (state === "needs-optin") {
    return (
      <EmptyState
        title="Join the cofounder pool"
        description="Become discoverable to other founders — opt in to start matching. You're opt-out by default; you can leave anytime."
        action={
          <button
            type="button"
            onClick={joinPool}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--brand-gradient)" }}
          >
            {busy ? "Joining…" : "Join the pool"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        }
      />
    );
  }

  if (state === "needs-company") {
    return (
      <EmptyState
        title="Compile your company first"
        description="Your cofounder card is built from your Startup OS company. Compile one, then join the pool."
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
    );
  }

  if (state === "error") {
    return (
      <EmptyState
        title="Couldn't load the pool"
        description="Something went wrong loading cofounder candidates."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-neutral-7 px-4 py-2 text-sm font-semibold text-neutral-12"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (state === "empty") {
    return (
      <div className="flex flex-col items-center gap-5">
        {matched ? <MatchBanner card={matched} locale={locale} /> : null}
        <EmptyState
          title="You're all caught up"
          description="No more founders to review right now. New companies appear here as founders join the pool."
        />
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-5">
      {matched ? <MatchBanner card={matched} locale={locale} /> : null}

      <AnimateIn key={current.profileId} preset="scale">
        <CofounderCard data={current} />
      </AnimateIn>

      {pitchMode ? (
        <div className="w-full max-w-sm">
          <Textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value.slice(0, PITCH_MAX))}
            placeholder="Why you two should build together — one honest paragraph."
            rows={3}
            aria-label="Pitch message"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setPitchMode(false);
                setPitch("");
              }}
              className="text-xs font-medium text-neutral-10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || pitch.trim().length === 0}
              onClick={() => void act("PITCH", pitch.trim())}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--brand-gradient)" }}
            >
              <PaperAirplane className="size-3.5" aria-hidden="true" />
              Send pitch
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <DeckAction
            label="Pass"
            onClick={() => void act("PASS")}
            disabled={busy}
            className="border-neutral-7 text-neutral-11 hover:bg-neutral-3"
          >
            <Cross className="size-5" aria-hidden="true" />
          </DeckAction>
          <DeckAction
            label="Interested"
            onClick={() => void act("INTERESTED")}
            disabled={busy}
            className="border-blue-7 text-blue-10 hover:bg-blue-3"
          >
            <Heart className="size-5" aria-hidden="true" />
          </DeckAction>
          <DeckAction
            label="Pitch"
            onClick={() => setPitchMode(true)}
            disabled={busy}
            className="border-neutral-7 text-neutral-11 hover:bg-neutral-3"
          >
            <PaperAirplane className="size-5" aria-hidden="true" />
          </DeckAction>
        </div>
      )}

      <p className="text-xs text-neutral-9">
        {index + 1} of {cards.length} · matched on compiled company, not a résumé
      </p>
    </div>
  );
}

function DeckAction({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex size-12 items-center justify-center rounded-full border bg-neutral-1 transition-colors disabled:opacity-50 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function MatchBanner({ card, locale }: { card: DiscoverCard; locale: string }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-blue-7 bg-blue-2 p-4 dark:bg-blue-9/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-11">
        <Sparkles className="size-4" aria-hidden="true" />
        It's a match — {card.companyName}
      </div>
      <p className="mt-1 text-xs text-neutral-11">
        You both signalled interest. Open the Cofounder Room to talk and decide whether to form a
        team.
      </p>
      <Link
        href={`/${locale}/cofounder/matches`}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-11"
      >
        View matches
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
