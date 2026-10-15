"use client";

import { ArrowRight, Cross, Heart, PaperAirplane, Sparkles } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { CofounderCard, type CofounderCardData } from "./cofounder-card";

interface DiscoverCard extends CofounderCardData {
  readonly profileId: string;
}

type DeckState = "loading" | "needs-optin" | "needs-company" | "active" | "empty" | "error";
type InterestKind = "PASS" | "INTERESTED" | "PITCH";

const PITCH_MAX = 1000;
const SWIPE_THRESHOLD = 110;
// Brand "spring" easing ([0.34, 1.56, 0.64, 1]) for the snap-back / fly-out.
const CARD_TRANSITION = "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-out";

export function DiscoverDeck() {
  const tc = useTranslations("copy.cofounderMatchDiscoverDeck");
  const pathname = usePathname();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";

  const [state, setState] = useState<DeckState>("loading");
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pitchMode, setPitchMode] = useState(false);
  const [pitch, setPitch] = useState("");
  const [matched, setMatched] = useState<DiscoverCard | null>(null);

  // Drag / fly-out state for the top card.
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<-1 | 0 | 1>(0);
  const dragStartX = useRef<number | null>(null);
  const pendingKind = useRef<InterestKind | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/cofounder/discover", { credentials: "include" });
      if (!res.ok) return setState("error");
      const data = (await res.json()) as { cards?: DiscoverCard[]; reason?: string };
      if (data.reason === "not-opted-in") return setState("needs-optin");
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
      if (res.status === 409) return setState("needs-company");
      if (res.ok) return load();
      setState("error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const current = cards[index];

  // Perform the decision: record it, surface a match, advance to the next card.
  const act = useCallback(
    async (kind: InterestKind, pitchText?: string) => {
      const card = cards[index];
      if (!card) return;
      setBusy(true);
      try {
        const res = await fetch("/api/cofounder/interest", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ toProfileId: card.profileId, kind, pitch: pitchText }),
        });
        if (res.ok) {
          const data = (await res.json()) as { matched?: boolean };
          if (data.matched) setMatched(card);
        }
      } catch {
        // Non-fatal: advancing past a failed signal beats blocking the deck.
      } finally {
        const nextIndex = index + 1;
        setIndex(nextIndex);
        setOffset(0);
        setLeaving(0);
        setPitchMode(false);
        setPitch("");
        setBusy(false);
        if (nextIndex >= cards.length) setState("empty");
      }
    },
    [cards, index],
  );

  // Trigger the fly-out animation; act() runs when the transition ends.
  const commit = useCallback(
    (kind: Exclude<InterestKind, "PITCH">, dir: -1 | 1) => {
      if (busy || leaving !== 0 || pitchMode) return;
      pendingKind.current = kind;
      setDragging(false);
      setLeaving(dir);
    },
    [busy, leaving, pitchMode],
  );

  const onCardTransitionEnd = useCallback(() => {
    if (leaving !== 0 && pendingKind.current) {
      const kind = pendingKind.current;
      pendingKind.current = null;
      void act(kind);
    }
  }, [leaving, act]);

  // Keyboard: ← pass, → interested, P pitch.
  useEffect(() => {
    if (state !== "active") return;
    const onKey = (e: KeyboardEvent) => {
      if (busy || pitchMode || leaving !== 0) return;
      if (e.key === "ArrowLeft") commit("PASS", -1);
      else if (e.key === "ArrowRight") commit("INTERESTED", 1);
      else if (e.key.toLowerCase() === "p") setPitchMode(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, busy, pitchMode, leaving, commit]);

  if (state === "loading") {
    return (
      <div className="mx-auto h-[420px] w-full max-w-sm animate-pulse rounded-[28px] border border-neutral-6 bg-neutral-2" />
    );
  }

  if (state === "needs-optin") {
    return (
      <EmptyState
        title={tc("joinTheCofounderPool")}
        description={tc("becomeDiscoverableToOther")}
        action={
          <Button
            type="button"
            shape="pill"
            onClick={joinPool}
            disabled={busy}
            suffix={<ArrowRight className="size-4" aria-hidden="true" />}
          >
            {busy ? "Joining…" : "Join the pool"}
          </Button>
        }
      />
    );
  }

  if (state === "needs-company") {
    return (
      <EmptyState
        title={tc("compileYourCompanyFirst")}
        description={tc("yourCofounderCardIs")}
        action={
          <Link
            href={`/${locale}/startup-os`}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-12 px-4 py-2 text-sm font-semibold text-neutral-1 transition-colors hover:bg-neutral-11 dark:text-neutral-12"
          >
            {tc("compileYourCompany")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  if (state === "error") {
    return (
      <EmptyState
        title={tc("couldnTLoadThe")}
        description={tc("somethingWentWrongLoading")}
        action={
          <Button type="button" variant="outline" shape="pill" onClick={() => void load()}>
            {tc("tryAgain")}
          </Button>
        }
      />
    );
  }

  if (state === "empty") {
    return (
      <div className="flex flex-col items-center gap-5">
        {matched ? <MatchBanner card={matched} locale={locale} /> : null}
        <EmptyState title={tc("youReAllCaught")} description={tc("noMoreFoundersTo")} />
      </div>
    );
  }

  if (!current) return null;

  const likeOpacity = Math.max(0, Math.min(1, offset / SWIPE_THRESHOLD));
  const nopeOpacity = Math.max(0, Math.min(1, -offset / SWIPE_THRESHOLD));
  const peek = cards.slice(index + 1, index + 3); // up to 2 cards behind

  const startDrag = (clientX: number) => {
    if (busy || pitchMode || leaving !== 0) return;
    dragStartX.current = clientX;
    setDragging(true);
  };
  const moveDrag = (clientX: number) => {
    if (!dragging || dragStartX.current === null) return;
    setOffset(clientX - dragStartX.current);
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    dragStartX.current = null;
    if (offset > SWIPE_THRESHOLD) commit("INTERESTED", 1);
    else if (offset < -SWIPE_THRESHOLD) commit("PASS", -1);
    else setOffset(0); // snap back
  };

  const cardTransform =
    leaving !== 0
      ? `translateX(${leaving * 140}%) rotate(${leaving * 14}deg)`
      : `translateX(${offset}px) rotate(${offset * 0.05}deg)`;

  return (
    <div className="flex flex-col items-center gap-6">
      {matched ? <MatchBanner card={matched} locale={locale} /> : null}

      {/* Card stack */}
      <div className="relative flex h-[420px] w-full max-w-sm items-start justify-center">
        {peek
          .map((c, i) => (
            <div
              key={c.profileId}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
              style={{
                transform: `translateY(${(i + 1) * 12}px) scale(${1 - (i + 1) * 0.04})`,
                opacity: 1 - (i + 1) * 0.4,
                zIndex: 0,
              }}
            >
              <CofounderCard data={c} />
            </div>
          ))
          .reverse()}

        {/* Top, draggable card — keyed so the next card mounts fresh at center
            instead of sliding in from the previous card's fly-out position. */}
        <div
          key={current.profileId}
          className="absolute inset-x-0 top-0 flex touch-none select-none justify-center"
          style={{
            transform: cardTransform,
            opacity: leaving !== 0 ? 0 : 1,
            transition: dragging ? "none" : CARD_TRANSITION,
            zIndex: 10,
            cursor: dragging ? "grabbing" : "grab",
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            startDrag(e.clientX);
          }}
          onPointerMove={(e) => moveDrag(e.clientX)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onTransitionEnd={onCardTransitionEnd}
        >
          <div className="relative">
            <CofounderCard data={current} />
            {/* Swipe stamps */}
            <span
              className="pointer-events-none absolute left-4 top-4 -rotate-12 rounded-md border-2 border-success px-2 py-0.5 text-sm font-extrabold uppercase tracking-wider text-success-strong"
              style={{ opacity: likeOpacity }}
            >
              {tc("interested")}
            </span>
            <span
              className="pointer-events-none absolute right-4 top-4 rotate-12 rounded-md border-2 px-2 py-0.5 text-sm font-extrabold uppercase tracking-wider"
              style={{
                opacity: nopeOpacity,
                color: "hsl(var(--destructive-strong))",
                borderColor: "var(--status-danger)",
              }}
            >
              {tc("pass")}
            </span>
          </div>
        </div>
      </div>

      {pitchMode ? (
        <div className="w-full max-w-sm">
          <Textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value.slice(0, PITCH_MAX))}
            placeholder={tc("whyYouTwoShould")}
            rows={3}
            aria-label={tc("pitchMessage")}
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
              {tc("cancel")}
            </button>
            <Button
              type="button"
              shape="pill"
              size="sm"
              disabled={busy || pitch.trim().length === 0}
              onClick={() => void act("PITCH", pitch.trim())}
              prefix={<PaperAirplane className="size-3.5" aria-hidden="true" />}
            >
              {tc("sendPitch")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <DeckAction
            label={tc("pass")}
            hint="←"
            onClick={() => commit("PASS", -1)}
            disabled={busy || leaving !== 0}
            className="text-neutral-11 hover:border-neutral-8 hover:bg-neutral-3"
          >
            <Cross className="size-6" aria-hidden="true" />
          </DeckAction>
          <DeckAction
            label={tc("pitch")}
            hint="P"
            small
            onClick={() => setPitchMode(true)}
            disabled={busy || leaving !== 0}
            className="text-primary hover:border-primary/30 hover:bg-primary/10"
          >
            <PaperAirplane className="size-5" aria-hidden="true" />
          </DeckAction>
          <DeckAction
            label={tc("interested")}
            hint="→"
            onClick={() => commit("INTERESTED", 1)}
            disabled={busy || leaving !== 0}
            className="text-success-strong hover:border-success/40 hover:bg-success/10"
          >
            <Heart className="size-6" aria-hidden="true" />
          </DeckAction>
        </div>
      )}

      <p className="text-center text-xs text-neutral-9">
        {tc("ofDragTapOr", { value0: index + 1, length: cards.length })}
      </p>
    </div>
  );
}

function DeckAction({
  label,
  hint,
  small,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  hint?: string;
  small?: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      shape="circle"
      aria-label={`${label}${hint ? ` (${hint})` : ""}`}
      title={label}
      onClick={onClick}
      disabled={disabled}
      shadow="sm"
      className={cn(
        "transition-shadow duration-micro hover:shadow-md",
        small ? "size-12" : "size-16",
        className,
      )}
    >
      {children}
    </Button>
  );
}

function MatchBanner({ card, locale }: { card: DiscoverCard; locale: string }) {
  const tc = useTranslations("copy.cofounderMatchDiscoverDeck");
  return (
    <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-primary/5 p-4 dark:bg-primary/15">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="size-4" aria-hidden="true" />
        {tc("itSAMatch")} {card.companyName}
      </div>
      <p className="mt-1 text-xs text-neutral-11">{tc("youBothSignalledInterest")}</p>
      <Link
        href={`/${locale}/cofounder/matches`}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
      >
        {tc("viewMatches")}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
