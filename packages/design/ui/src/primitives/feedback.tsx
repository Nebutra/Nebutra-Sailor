"use client";

import {
  FaceHappy,
  FaceSad,
  FaceSmile,
  FaceUnhappy,
  Information,
  Cross as X,
} from "@nebutra/icons";
import * as React from "react";
import { feedbackTokens } from "../tokens/components/feedback";
import { cn } from "../utils/cn";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";

export type FeedbackEmotion = "love" | "okay" | "not-great" | "hate";
export type FeedbackTopic = string | { value: string; label: string };
export type FeedbackMetadata = Record<string, string | number | boolean | null | undefined>;

export interface FeedbackPayload {
  label: string;
  emotion?: FeedbackEmotion;
  message: string;
  topic?: string;
  metadata?: FeedbackMetadata;
}

interface FeedbackBaseProps {
  /** Short visible label. Use Title Case, e.g. "Feedback" or "Report a Bug". */
  label: string;
  /** Prompt shown next to the emotion row. Defaults to "How was this experience?". */
  copy?: string;
  /** Pre-defined topics shown in the topic select. */
  topics?: readonly FeedbackTopic[];
  /** Show the default triage topics when `topics` is omitted. */
  showTopics?: boolean;
  /** Non-PII context attached to the submission. */
  metadata?: FeedbackMetadata;
  /** Called when the user submits feedback. */
  onSubmit?: (payload: FeedbackPayload) => void | Promise<void>;
  /** Skip `onSubmit` while preserving local interaction. */
  dryRun?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface FeedbackDefaultProps extends FeedbackBaseProps {
  type?: "default";
  defaultOpen?: boolean;
}

export interface FeedbackInlineProps extends FeedbackBaseProps {
  type: "inline";
  defaultExpanded?: boolean;
}

export type FeedbackProps = FeedbackDefaultProps | FeedbackInlineProps;

type FeedbackCssVar =
  | "--feedback-width"
  | "--feedback-padding"
  | "--feedback-gap"
  | "--feedback-row-gap"
  | "--feedback-trigger-height"
  | "--feedback-control-size"
  | "--feedback-textarea-height"
  | "--feedback-radius"
  | "--feedback-panel-radius"
  | "--feedback-duration"
  | "--feedback-easing";

const defaultTopics = ["Bug", "Pricing", "Documentation", "Performance", "Other"] as const;

const emotionOptions = [
  { value: "love", label: "Love It", icon: FaceHappy },
  { value: "okay", label: "It's Okay", icon: FaceSmile },
  { value: "not-great", label: "Not Great", icon: FaceUnhappy },
  { value: "hate", label: "Hate It", icon: FaceSad },
] as const satisfies readonly {
  value: FeedbackEmotion;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}[];

const feedbackCssVars = {
  "--feedback-width": `${feedbackTokens.width}px`,
  "--feedback-padding": `${feedbackTokens.padding}px`,
  "--feedback-gap": `${feedbackTokens.gap.stack}px`,
  "--feedback-row-gap": `${feedbackTokens.gap.row}px`,
  "--feedback-trigger-height": `${feedbackTokens.triggerHeight}px`,
  "--feedback-control-size": `${feedbackTokens.controlSize}px`,
  "--feedback-textarea-height": `${feedbackTokens.textareaHeight}px`,
  "--feedback-radius": `${feedbackTokens.radius.control}px`,
  "--feedback-panel-radius": `${feedbackTokens.radius.panel}px`,
  "--feedback-duration": `${feedbackTokens.motion.duration}ms`,
  "--feedback-easing": feedbackTokens.motion.easing,
} satisfies React.CSSProperties & Record<FeedbackCssVar, string>;

function normalizeTopics(
  topics: readonly FeedbackTopic[] | undefined,
  showTopics: boolean | undefined,
) {
  const source = topics?.length ? topics : showTopics ? defaultTopics : [];
  return source.map((topic) =>
    typeof topic === "string" ? { value: topic, label: topic } : topic,
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Couldn't send feedback. Try again.";
}

function MarkdownHint() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <Information aria-hidden="true" size={14} />
      Markdown supported.
    </span>
  );
}

interface EmotionButtonProps {
  emotion: FeedbackEmotion;
  name: string;
  selected: boolean;
  disabled?: boolean | undefined;
  onSelect: (emotion: FeedbackEmotion) => void;
}

function EmotionButton({ emotion, name, selected, disabled, onSelect }: EmotionButtonProps) {
  const option = emotionOptions.find((item) => item.value === emotion);
  if (!option) return null;
  const Icon = option.icon;

  return (
    <label
      className={cn(
        "inline-flex size-[var(--feedback-control-size)] items-center justify-center rounded-[var(--feedback-radius)] text-muted-foreground",
        "transition-[background-color,color,box-shadow] duration-[var(--feedback-duration)] ease-[var(--feedback-easing)]",
        "hover:bg-accent hover:text-accent-foreground",
        "has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
        "has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50",
        selected && "bg-accent text-accent-foreground",
      )}
    >
      <input
        aria-label={option.label}
        checked={selected}
        className="sr-only"
        disabled={disabled}
        name={name}
        onChange={() => onSelect(emotion)}
        type="radio"
        value={emotion}
      />
      <Icon aria-hidden="true" size={16} />
    </label>
  );
}

interface FeedbackFormProps {
  label: string;
  copy: string;
  topics: readonly { value: string; label: string }[];
  metadata?: FeedbackMetadata;
  onSubmit?: (payload: FeedbackPayload) => void | Promise<void>;
  dryRun?: boolean;
  disabled?: boolean | undefined;
  initialEmotion?: FeedbackEmotion | undefined;
  onDone: () => void;
}

function FeedbackForm({
  label,
  copy,
  topics,
  metadata,
  onSubmit,
  dryRun,
  disabled,
  initialEmotion,
  onDone,
}: FeedbackFormProps) {
  const promptId = React.useId();
  const emotionName = React.useId();
  const errorId = React.useId();
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [emotion, setEmotion] = React.useState<FeedbackEmotion | undefined>(initialEmotion);
  const [message, setMessage] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSubmit = message.trim().length > 0 && !submitting && !disabled;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(undefined);

    const payload: FeedbackPayload = {
      label,
      message: message.trim(),
      ...(emotion ? { emotion } : {}),
      ...(topic ? { topic } : {}),
      ...(metadata ? { metadata } : {}),
    };

    try {
      if (!dryRun) await onSubmit?.(payload);
      setMessage("");
      setTopic("");
      setEmotion(undefined);
      onDone();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-[var(--feedback-gap)]" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-[var(--feedback-row-gap)]">
        <p className="font-medium text-foreground text-sm" id={promptId}>
          {copy}
        </p>
        <div aria-labelledby={promptId} className="flex items-center gap-0.5" role="radiogroup">
          {emotionOptions.map((option) => (
            <EmotionButton
              key={option.value}
              emotion={option.value}
              name={emotionName}
              selected={emotion === option.value}
              disabled={disabled || submitting}
              onSelect={(nextEmotion) => setEmotion(() => nextEmotion)}
            />
          ))}
        </div>
      </div>

      {topics.length ? (
        <Select
          value={topic}
          onValueChange={(nextTopic) => setTopic(typeof nextTopic === "string" ? nextTopic : "")}
          disabled={disabled || submitting}
        >
          <SelectTrigger aria-label="Feedback topic">
            <SelectValue placeholder="Select a topic..." />
          </SelectTrigger>
          <SelectContent>
            {topics.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="grid gap-[var(--feedback-row-gap)]">
        <Textarea
          ref={textareaRef}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          aria-labelledby={promptId}
          className="min-h-[var(--feedback-textarea-height)] resize-none"
          disabled={disabled || submitting}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Your feedback..."
          value={message}
        />
        <div className="flex items-center justify-between gap-[var(--feedback-row-gap)]">
          <MarkdownHint />
          {error ? (
            <p className="text-destructive text-xs" id={errorId} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end border-border border-t pt-[var(--feedback-padding)]">
        <Button disabled={!canSubmit} loading={submitting} size="sm" type="submit">
          Send
        </Button>
      </div>
    </form>
  );
}

function FeedbackDefault({
  label,
  copy = "How was this experience?",
  topics,
  showTopics,
  metadata,
  onSubmit,
  dryRun,
  disabled,
  defaultOpen = false,
  className,
}: FeedbackDefaultProps) {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = React.useState(defaultOpen);
  const resolvedTopics = React.useMemo(
    () => normalizeTopics(topics, showTopics),
    [topics, showTopics],
  );

  const closeAndReturnFocus = React.useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          className={className}
          disabled={disabled}
          size="sm"
          type="button"
          variant="secondary"
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[var(--feedback-width)] rounded-[var(--feedback-panel-radius)] border-border bg-popover p-[var(--feedback-padding)] text-popover-foreground shadow-md"
        sideOffset={feedbackTokens.sideOffset}
        style={feedbackCssVars as React.CSSProperties}
      >
        <div className="mb-[var(--feedback-gap)] flex items-center justify-between gap-[var(--feedback-row-gap)]">
          <h2 className="font-medium text-foreground text-sm">{label}</h2>
          <button
            aria-label="Close feedback"
            className="inline-flex size-7 items-center justify-center rounded-[var(--feedback-radius)] text-muted-foreground transition-[background-color,color] duration-[var(--feedback-duration)] ease-[var(--feedback-easing)] hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={closeAndReturnFocus}
            type="button"
          >
            <X aria-hidden="true" size={14} />
          </button>
        </div>
        <FeedbackForm
          label={label}
          copy={copy}
          topics={resolvedTopics}
          {...(metadata ? { metadata } : {})}
          {...(onSubmit ? { onSubmit } : {})}
          {...(dryRun !== undefined ? { dryRun } : {})}
          {...(disabled !== undefined ? { disabled } : {})}
          onDone={closeAndReturnFocus}
        />
      </PopoverContent>
    </Popover>
  );
}

function FeedbackInline({
  label,
  copy = "Was this helpful?",
  topics,
  showTopics,
  metadata,
  onSubmit,
  dryRun,
  disabled,
  defaultExpanded = false,
  className,
}: FeedbackInlineProps) {
  const rootRef = React.useRef<HTMLFieldSetElement | null>(null);
  const emotionName = React.useId();
  const [selectedEmotion, setSelectedEmotion] = React.useState<FeedbackEmotion | undefined>();
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const resolvedTopics = React.useMemo(
    () => normalizeTopics(topics, showTopics),
    [topics, showTopics],
  );

  React.useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setExpanded(false);
        setSelectedEmotion(undefined);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded]);

  return (
    <fieldset
      ref={rootRef}
      className={cn(
        "m-0 min-w-0 w-fit overflow-hidden rounded-[var(--feedback-panel-radius)] border border-border bg-card p-0 text-card-foreground shadow-sm",
        "transition-[max-height,width] duration-[var(--feedback-duration)] ease-[var(--feedback-easing)] motion-reduce:transition-none",
        expanded ? "w-[var(--feedback-width)]" : "max-w-full",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setExpanded(false);
          setSelectedEmotion(undefined);
        }
      }}
      style={feedbackCssVars as React.CSSProperties}
    >
      <legend className="sr-only">{label}</legend>
      {!expanded ? (
        <div className="flex h-[var(--feedback-trigger-height)] items-center gap-[var(--feedback-row-gap)] px-[var(--feedback-padding)]">
          <p className="whitespace-nowrap text-muted-foreground text-sm">{copy}</p>
          <div aria-label={copy} className="flex items-center gap-0.5" role="radiogroup">
            {emotionOptions.map((option) => (
              <EmotionButton
                key={option.value}
                emotion={option.value}
                name={emotionName}
                selected={selectedEmotion === option.value}
                disabled={disabled ?? false}
                onSelect={(emotion) => {
                  setSelectedEmotion(emotion);
                  setExpanded(true);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-[var(--feedback-padding)]">
          <FeedbackForm
            label={label}
            copy={copy}
            topics={resolvedTopics}
            {...(selectedEmotion ? { initialEmotion: selectedEmotion } : {})}
            {...(metadata ? { metadata } : {})}
            {...(onSubmit ? { onSubmit } : {})}
            {...(dryRun !== undefined ? { dryRun } : {})}
            {...(disabled !== undefined ? { disabled } : {})}
            onDone={() => {
              setExpanded(false);
              setSelectedEmotion(undefined);
            }}
          />
        </div>
      )}
    </fieldset>
  );
}

export function Feedback(props: FeedbackProps) {
  if (props.type === "inline") {
    return <FeedbackInline {...props} />;
  }
  return <FeedbackDefault {...props} />;
}

Feedback.displayName = "Feedback";
