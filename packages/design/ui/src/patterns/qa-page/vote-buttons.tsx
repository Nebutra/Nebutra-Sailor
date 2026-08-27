"use client";

import { ChevronDown, ChevronUp } from "@nebutra/icons";
import { Button } from "../../primitives/button";
import { cn } from "../../utils/cn";
import type { VoteType } from "./types";

/* -------------------------------------------------------------------------- *\
 *  VoteButtons — vertical up/down vote control for a question or answer.
 *
 *  Net score is computed locally as `votes + delta(userVote)` so the
 *  optimistic UI matches the post's stored count without round-tripping.
\* -------------------------------------------------------------------------- */

export interface VoteButtonsProps {
  votes: number;
  userVote: VoteType;
  onVote: (next: "up" | "down") => void;
  /** @default "default" */
  size?: "default" | "large";
  /** Label that describes what is being voted on (for screen readers). */
  label?: string;
}

function voteDelta(userVote: VoteType): number {
  if (userVote === "up") return 1;
  if (userVote === "down") return -1;
  return 0;
}

export function VoteButtons({
  votes,
  userVote,
  onVote,
  size = "default",
  label = "post",
}: VoteButtonsProps) {
  const iconSize = size === "large" ? "h-5 w-5" : "h-4 w-4";
  const scoreSize = size === "large" ? "text-lg" : "text-base";
  const score = votes + voteDelta(userVote);

  return (
    <fieldset className="flex flex-col items-center gap-2">
      <legend className="sr-only">Vote on {label}</legend>
      <Button
        type="button"
        variant="ghost"
        size={size === "large" ? "default" : "sm"}
        aria-label={`Upvote ${label}`}
        aria-pressed={userVote === "up"}
        onClick={() => onVote("up")}
        className={cn("p-2", userVote === "up" && "bg-primary/10 text-primary hover:bg-primary/15")}
      >
        <ChevronUp className={iconSize} aria-hidden="true" />
      </Button>
      <span
        className={cn(
          "font-bold tabular-nums",
          scoreSize,
          userVote === "up" && "text-primary",
          userVote === "down" && "text-muted-foreground",
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {score}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={size === "large" ? "default" : "sm"}
        aria-label={`Downvote ${label}`}
        aria-pressed={userVote === "down"}
        onClick={() => onVote("down")}
        className={cn(
          "p-2",
          userVote === "down" && "bg-muted text-muted-foreground hover:bg-muted",
        )}
      >
        <ChevronDown className={iconSize} aria-hidden="true" />
      </Button>
    </fieldset>
  );
}
