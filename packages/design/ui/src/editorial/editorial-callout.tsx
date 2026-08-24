import { CheckCircle, Information, Sparkles, Warning, WarningFill } from "@nebutra/icons";
import type { ComponentType, ReactNode } from "react";
import { cn } from "../utils/cn";
import {
  EDITORIAL_BODY,
  EDITORIAL_EYEBROW,
  EDITORIAL_TONE_FG,
  EDITORIAL_TONE_PLATE,
  EDITORIAL_TONE_WASH,
  type EditorialTone,
  editorialBlock,
  editorialFrame,
  editorialToneStyle,
} from "./editorial-surface";

const TONE_ICON: Record<EditorialTone, ComponentType<{ className?: string }>> = {
  note: Information,
  insight: Sparkles,
  success: CheckCircle,
  warning: Warning,
  danger: WarningFill,
};

export type EditorialCalloutProps = {
  /** Body copy. A string is wrapped in a paragraph; nodes are rendered as given. */
  children?: ReactNode;
  className?: string;
  /** Shown in the eyebrow slot when there is no title — pass a localized word. */
  label?: string;
  title?: string | null;
  tone?: EditorialTone;
};

/**
 * Aside for a note, insight, caution or correction.
 *
 * Tone is a 2px rail plus a tinted icon plate, not a filled panel: a reader
 * scrolling past four callouts should see four asides, not four highlighter
 * swipes.
 */
export function EditorialCallout({
  children,
  className,
  label,
  title,
  tone = "note",
}: EditorialCalloutProps) {
  if (!title && !children) return null;

  const Icon = TONE_ICON[tone];
  const eyebrow = title ?? label ?? tone;

  return (
    <aside
      className={cn(
        editorialBlock({ spacing: "normal" }),
        editorialFrame({ elevation: "resting" }),
        EDITORIAL_TONE_WASH,
        "relative overflow-hidden pl-6 pr-5 py-5",
        className,
      )}
      style={editorialToneStyle(tone)}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-[var(--editorial-tone)]" />
      <div className="flex gap-3.5">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
            EDITORIAL_TONE_PLATE,
            EDITORIAL_TONE_FG,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className={EDITORIAL_EYEBROW}>{eyebrow}</div>
          {typeof children === "string" ? (
            <p className={cn("mt-2.5", EDITORIAL_BODY)}>{children}</p>
          ) : (
            children && <div className={cn("mt-2.5", EDITORIAL_BODY)}>{children}</div>
          )}
        </div>
      </div>
    </aside>
  );
}
