"use client";

import * as React from "react";
import { cn } from "../utils/cn";

type Modifier = "meta" | "shift" | "alt" | "ctrl";
type Platform = "apple" | "other";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Command on macOS/iOS; Ctrl on Windows/Linux. */
  meta?: boolean;
  /** Shift modifier. */
  shift?: boolean;
  /** Option on macOS/iOS; Alt on Windows/Linux. */
  alt?: boolean;
  /** Control modifier. */
  ctrl?: boolean;
  /** Smaller size for dense surfaces. */
  small?: boolean;
  /** One key, digit, punctuation mark, or named key. */
  children?: React.ReactNode;
  className?: string;
}

const modifierOrder = ["meta", "shift", "alt", "ctrl"] as const satisfies ReadonlyArray<Modifier>;

const appleModifierSymbols: Record<Modifier, string> = {
  meta: "⌘",
  shift: "⇧",
  alt: "⌥",
  ctrl: "⌃",
};

const otherModifierSymbols: Record<Modifier, string> = {
  meta: "Ctrl",
  shift: "Shift",
  alt: "Alt",
  ctrl: "Ctrl",
};

const modifierLabels: Record<Modifier, string> = {
  meta: "Command or Control",
  shift: "Shift",
  alt: "Option or Alt",
  ctrl: "Control",
};

function getClientPlatform(): Platform {
  const platform = window.navigator.platform.toLowerCase();
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isApple = /mac|iphone|ipad|ipod/.test(platform) || /mac|iphone|ipad|ipod/.test(userAgent);

  return isApple ? "apple" : "other";
}

function subscribePlatform(): () => void {
  return () => undefined;
}

function usePlatform(): Platform {
  return React.useSyncExternalStore(subscribePlatform, getClientPlatform, () => "apple");
}

function normalizeKey(children: React.ReactNode): React.ReactNode {
  if (typeof children !== "string") {
    return children;
  }

  const trimmed = children.trim();

  if (/^[a-z]$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return trimmed;
}

function getModifierSymbols(platform: Platform): Record<Modifier, string> {
  return platform === "apple" ? appleModifierSymbols : otherModifierSymbols;
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  (
    { meta, shift, alt, ctrl, small, children, className, "aria-label": ariaLabel, ...props },
    ref,
  ) => {
    const platform = usePlatform();
    const symbols = getModifierSymbols(platform);
    const activeModifiers = modifierOrder.filter((modifier) => {
      if (modifier === "meta") return meta;
      if (modifier === "shift") return shift;
      if (modifier === "alt") return alt;
      return ctrl;
    });
    const normalizedKey = normalizeKey(children);
    const visualParts = [
      ...activeModifiers.map((modifier) => symbols[modifier]),
      normalizedKey,
    ].filter(Boolean);
    const accessibleName =
      ariaLabel ??
      [
        ...activeModifiers.map((modifier) => modifierLabels[modifier]),
        typeof normalizedKey === "string" ? normalizedKey : undefined,
      ]
        .filter(Boolean)
        .join(" ");

    return (
      <kbd
        ref={ref as React.Ref<HTMLElement>}
        aria-label={accessibleName || undefined}
        className={cn(
          "inline-flex select-none items-center justify-center gap-0.5 rounded-[var(--radius-sm)] border border-border bg-muted font-mono font-medium leading-none text-muted-foreground tabular-nums",
          small ? "min-h-4 min-w-4 px-1 py-0 text-xs" : "min-h-5 min-w-5 px-1.5 py-0.5 text-xs",
          className,
        )}
        {...props}
      >
        {visualParts.join("")}
      </kbd>
    );
  },
);
Kbd.displayName = "Kbd";

export { Kbd };
