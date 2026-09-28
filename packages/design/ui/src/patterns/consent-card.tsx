"use client";

import type * as React from "react";
import { Button } from "../primitives/button";
import { cn } from "../utils/cn";

export interface ConsentCardAction {
  label: string;
  onClick: () => void;
}

export interface ConsentCardProps {
  /** One or two sentences, links included. The card has no title: the choice is the headline. */
  children: React.ReactNode;
  /** The choice that keeps the least — shown first, never styled weaker than the other. */
  decline: ConsentCardAction;
  accept: ConsentCardAction;
  /** Which bottom corner it floats in. Default: the one opposite a left-hand rail. */
  corner?: "left" | "right";
  /** Accessible name of the prompt. */
  label?: string;
  className?: string;
}

/**
 * The consent prompt as a small card in a bottom corner, not a bar across the
 * page: it asks without covering what the visitor came to read. Both choices
 * are equal buttons — declining is as easy as accepting.
 *
 * Presentational only. The app decides whether to show it and stores the
 * answer; this renders the question.
 */
export function ConsentCard({
  children,
  decline,
  accept,
  corner = "right",
  label = "Cookie preferences",
  className,
}: ConsentCardProps) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={label}
      data-ui="nebutra-consent-card"
      className={cn(
        "fixed bottom-4 z-[var(--layer-banner)] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-background/85 p-4 text-sm shadow-glass-md backdrop-blur-xl sm:bottom-6",
        corner === "right" ? "right-4 sm:right-6" : "left-4 sm:left-6",
        className,
      )}
    >
      <div className="text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-4 hover:[&_a]:decoration-foreground">
        {children}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={decline.onClick}
        >
          {decline.label}
        </Button>
        <Button type="button" variant="ink" size="sm" className="flex-1" onClick={accept.onClick}>
          {accept.label}
        </Button>
      </div>
    </div>
  );
}
