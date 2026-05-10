"use client";

import { Frown, Meh, Plus, Smile, X } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

// =============================================================================
// Types
// =============================================================================

type Emotion = "happy" | "neutral" | "sad" | "other";

export interface FeedbackPayload {
  label: string;
  emotion?: Emotion;
  message: string;
  topic?: string;
  metadata?: Record<string, string>;
}

export interface FeedbackProps {
  /** Product/feature label attached to every submission */
  label: string;
  /** Display variant — "default" shows a trigger button/popover, "inline" shows a reaction bar */
  type?: "default" | "inline";
  /** Pre-defined topics shown in the select dropdown */
  topics?: string[];
  /** Arbitrary key-value metadata attached to the submission */
  metadata?: Record<string, string>;
  /** Called when the user submits feedback — receives the full payload */
  onSubmit?: (payload: FeedbackPayload) => void | Promise<void>;
  /** When true the submit handler is not called (useful for UI demos) */
  dryRun?: boolean;
  className?: string;
}

// =============================================================================
// Emotion icons
// =============================================================================

const emotions: { value: Emotion; label: string }[] = [
  { value: "happy", label: "Happy" },
  { value: "neutral", label: "Neutral" },
  { value: "sad", label: "Sad" },
  { value: "other", label: "Other" },
];

function EmotionIcon({ value }: { value: Emotion }) {
  if (value === "happy") return <Smile size={16} aria-hidden="true" />;
  if (value === "neutral") return <Meh size={16} aria-hidden="true" />;
  if (value === "sad") return <Frown size={16} aria-hidden="true" />;
  return <Plus size={14} aria-hidden="true" />;
}

// =============================================================================
// EmotionButton
// =============================================================================

interface EmotionButtonProps {
  emotion: Emotion;
  selected: boolean;
  onClick: () => void;
}

function EmotionButton({ emotion, selected, onClick }: EmotionButtonProps) {
  const entry = emotions.find((e) => e.value === emotion);
  if (!entry) return null;
  return (
    <button
      type="button"
      aria-label={entry.label}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      )}
    >
      <EmotionIcon value={emotion} />
    </button>
  );
}

// =============================================================================
// FeedbackForm — shared panel content
// =============================================================================

interface FeedbackFormProps {
  label: string;
  topics?: string[];
  metadata?: Record<string, string>;
  onSubmit?: (payload: FeedbackPayload) => void | Promise<void>;
  dryRun?: boolean;
  onSuccess?: () => void;
  /** Pre-selected emotion (inline variant passes this in) */
  initialEmotion?: Emotion | undefined;
}

function FeedbackForm({
  label,
  topics,
  metadata,
  onSubmit,
  dryRun,
  onSuccess,
  initialEmotion,
}: FeedbackFormProps) {
  const [emotion, setEmotion] = React.useState<Emotion | undefined>(initialEmotion);
  const [message, setMessage] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const canSubmit = message.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    const payload: FeedbackPayload = {
      label,
      message: message.trim(),
      ...(emotion ? { emotion } : {}),
      ...(topic ? { topic } : {}),
      ...(metadata ? { metadata } : {}),
    };

    if (!dryRun) {
      await onSubmit?.(payload);
    }

    setSubmitting(false);
    setSubmitted(true);
    onSuccess?.();
  }

  if (submitted) {
    return (
      <div className="flex h-24 items-center justify-center">
        <p className="text-sm text-muted-foreground">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Topic select */}
      {topics && topics.length > 0 && (
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={cn(
            "w-full rounded-[var(--radius-md)] border bg-background px-3 py-2 text-sm",
            "text-foreground outline-none",
            "focus:ring-2 focus:ring-ring",
            !topic && "text-muted-foreground",
          )}
        >
          <option value="" disabled>
            Select a topic...
          </option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}

      {/* Textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Your feedback..."
        rows={4}
        className={cn(
          "w-full resize-none rounded-[var(--radius-md)] border bg-background px-3 py-2 text-sm",
          "text-foreground placeholder:text-muted-foreground",
          "outline-none focus:ring-2 focus:ring-ring",
        )}
      />

      {/* Bottom row: emotion buttons | md hint | send */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {emotions.map((e) => (
            <EmotionButton
              key={e.value}
              emotion={e.value}
              selected={emotion === e.value}
              onClick={() => setEmotion((prev) => (prev === e.value ? undefined : e.value))}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">md supported</span>
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className={cn(
              "rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-colors",
              "bg-foreground text-background hover:bg-foreground/90",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            {submitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Default variant — Popover trigger + panel
// =============================================================================

function FeedbackDefault({
  label,
  topics,
  metadata,
  onSubmit,
  dryRun,
  className,
}: Omit<FeedbackProps, "type">) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-[var(--radius-md)] border bg-background px-3 py-1.5 text-sm font-medium shadow-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          Feedback
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          "z-50 w-80 rounded-[var(--radius-lg)] border bg-background p-4 shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        )}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Feedback</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-[var(--radius-md)] p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close feedback"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <FeedbackForm
          label={label}
          {...(topics ? { topics } : {})}
          {...(metadata ? { metadata } : {})}
          {...(onSubmit ? { onSubmit } : {})}
          {...(dryRun !== undefined ? { dryRun } : {})}
          onSuccess={() => {
            // Close after a brief delay to show thank-you message
            setTimeout(() => setOpen(false), 1800);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Inline variant — "Was this helpful?" bar → expands to form
// =============================================================================

function FeedbackInline({
  label,
  topics,
  metadata,
  onSubmit,
  dryRun,
  className,
}: Omit<FeedbackProps, "type">) {
  const [selectedEmotion, setSelectedEmotion] = React.useState<Emotion | undefined>();
  const [expanded, setExpanded] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  function handleEmotionClick(e: Emotion) {
    setSelectedEmotion(e);
    setExpanded(true);
  }

  if (submitted) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>Thank you for your feedback!</p>
    );
  }

  if (expanded) {
    return (
      <div
        className={cn(
          "w-80 rounded-[var(--radius-lg)] border bg-background p-4 shadow-md",
          className,
        )}
      >
        <FeedbackForm
          label={label}
          {...(topics ? { topics } : {})}
          {...(metadata ? { metadata } : {})}
          {...(onSubmit ? { onSubmit } : {})}
          {...(dryRun !== undefined ? { dryRun } : {})}
          initialEmotion={selectedEmotion}
          onSuccess={() => {
            setSubmitted(true);
            setExpanded(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      <div className="flex items-center gap-0.5">
        {emotions.map((e) => (
          <EmotionButton
            key={e.value}
            emotion={e.value}
            selected={selectedEmotion === e.value}
            onClick={() => handleEmotionClick(e.value)}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Feedback — public API
// =============================================================================

/**
 * Feedback — gather text feedback with an associated emotion.
 *
 * @example
 * // Default trigger button
 * <Feedback label="my-app" onSubmit={(payload) => console.log(payload)} />
 *
 * @example
 * // Inline "Was this helpful?" bar
 * <Feedback label="my-app" type="inline" onSubmit={handleFeedback} />
 *
 * @example
 * // With topic select and metadata
 * <Feedback
 *   label="my-app"
 *   topics={["Bug", "Feature request", "Other"]}
 *   metadata={{ userId: "u_123", page: "/dashboard" }}
 *   onSubmit={handleFeedback}
 * />
 */
export function Feedback({ type = "default", ...props }: FeedbackProps) {
  if (type === "inline") {
    return <FeedbackInline {...props} />;
  }
  return <FeedbackDefault {...props} />;
}
Feedback.displayName = "Feedback";
