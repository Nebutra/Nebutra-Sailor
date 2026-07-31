"use client";

import {
  Check,
  CheckCircle,
  Copy,
  FileText,
  Lightning,
  PencilEdit,
  Sparkles,
  StopFill,
  ThumbDown,
  ThumbUp,
  Warning,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup, PromptInputBox } from "@nebutra/ui/components";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Button,
  Textarea,
} from "@nebutra/ui/primitives";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { resolveApiUrl } from "@/lib/api/browser-client";
import {
  type StartupConversationSummary,
  type UseStartupConversationResult,
  useStartupConversation,
} from "./use-startup-conversation";

/**
 * Conversational build panel for Startup OS — a self-contained, Lovable-grade
 * chat surface. It drives the SSE conversation hook and renders the live PLAN
 * prose, file-write rows as they stream in, a prompt composer, suggestion
 * chips, a streaming status row with a cancel control, and an error alert.
 *
 * `conversation` is injectable so unit tests can hand the panel a fully formed
 * fake hook state without touching the network — production callers omit it and
 * the panel spins up the real `useStartupConversation` for the given project.
 */

export interface StartupChatPanelProps {
  readonly projectId: string;
  /** Injectable hook result — defaults to the real `useStartupConversation`. */
  readonly conversation?: UseStartupConversationResult;
  /**
   * Fired exactly once per turn that completes successfully *and* changed at
   * least one file — this is the signal for the command center to reload the
   * project's files so the Code/Preview tabs reflect the generated edits. It is
   * NOT fired on error, cancellation, or a no-op turn (zero files), and never
   * fires twice for the same completed turn.
   */
  readonly onApplied?: () => void;
  /**
   * Render the panel's own brand header. Default `true`. The unified thread
   * column in the workspace already shows the company name + status, so it
   * mounts the panel with `showHeader={false}` to avoid a duplicate header.
   */
  readonly showHeader?: boolean;
  /**
   * Extra history rendered at the top of the scrollable stream — the thread
   * column passes its Proposition / CompanyContext / run cards here so the
   * conversation reads as one column (history above, live plan + composer below).
   */
  readonly history?: ReactNode;
}

const SUGGESTION_PROMPTS = ["再加一个定价页", "把 hero 改成品牌渐变", "生成 README"] as const;

const STATUS_LABELS: Record<UseStartupConversationResult["status"], string> = {
  idle: "Ready when you are",
  streaming: "Building your changes",
  done: "Changes applied",
  error: "The turn failed",
  cancelled: "Turn cancelled",
};

export function StartupChatPanel({
  projectId,
  conversation,
  onApplied,
  showHeader = true,
  history,
}: StartupChatPanelProps) {
  // Hooks must run unconditionally; the injected result simply shadows the live
  // one for tests. Both calls are cheap and side-effect-free until `send`.
  const live = useStartupConversation({ projectId });
  const state = conversation ?? live;

  const {
    status,
    isStreaming,
    plan,
    fileEvents,
    artifactEvents,
    summary,
    durationMs,
    turnId,
    userPrompt,
    error,
    send,
    cancel,
  } = state;

  // Close the conversational-generation loop: when a turn finishes (status →
  // "done") and it actually wrote files, notify the host once so it can reload
  // the workspace. A ref latch guards against re-firing on unrelated re-renders
  // (e.g. the parent re-rendering while still on the same completed turn) — the
  // latch only re-arms once we leave the "done" state (next streaming turn).
  const appliedTurnRef = useRef(false);
  useEffect(() => {
    if (status !== "done") {
      // A new turn (streaming/idle/error/cancelled) re-arms the latch.
      appliedTurnRef.current = false;
      return;
    }
    if (appliedTurnRef.current) return;
    // Only a turn that changed files is worth a workspace reload.
    const changedFiles = summary?.fileCount ?? fileEvents.length;
    if (changedFiles <= 0) return;
    appliedTurnRef.current = true;
    onApplied?.();
  }, [status, summary, fileEvents.length, onApplied]);

  const hasPlan = plan.trim().length > 0;
  const handleSend = (message: string) => {
    const instruction = message.trim();
    if (instruction.length === 0 || isStreaming) return;
    void send(instruction);
  };

  return (
    <AnimateIn preset="emerge" className="h-full min-h-0">
      <section
        aria-label="Startup OS conversational build"
        className="flex h-full min-h-0 flex-col bg-neutral-1 text-neutral-12"
      >
        {/* Header — suppressed when the workspace thread column already shows the
            company name + status above this panel. */}
        {showHeader ? (
          <header className="flex items-center gap-3 px-5 py-4">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-2xl text-white"
              style={{ background: "hsl(var(--primary))" }}
              aria-hidden="true"
            >
              <Sparkles className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold tracking-tight text-neutral-12">
                Build with conversation
              </h2>
              <p className="mt-0.5 truncate text-xs text-neutral-10">
                Describe a change and the agent edits your workspace live.
              </p>
            </div>
          </header>
        ) : null}

        {/* Scrollable stream — thread history (when merged) sits above the live plan. */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {history}
          {userPrompt ? (
            <UserMessage
              prompt={userPrompt}
              turnId={turnId}
              projectId={projectId}
              canRevert={status === "done" && Boolean(turnId)}
              onResend={handleSend}
              onReverted={() => onApplied?.()}
            />
          ) : null}
          <PlanArea hasPlan={hasPlan} isStreaming={isStreaming} plan={plan} />

          {fileEvents.length > 0 ? (
            <FileEventList events={fileEvents} isStreaming={isStreaming} />
          ) : null}

          {artifactEvents.length > 0 ? <ArtifactEventList events={artifactEvents} /> : null}

          {summary ? <SummaryCard summary={summary} durationMs={durationMs} /> : null}

          {error ? (
            <AnimateIn preset="fadeUp">
              <Alert variant="destructive" appearance="light" size="md">
                <AlertIcon>
                  <Warning aria-hidden="true" />
                </AlertIcon>
                <AlertContent>
                  <AlertTitle>Conversation failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </AlertContent>
              </Alert>
            </AnimateIn>
          ) : null}
        </div>

        {/* Composer footer — separated from the stream by background tint + spacing,
            not a border (Lovable-style region separation). */}
        <footer className="bg-neutral-2/40 px-5 py-4">
          <StatusRow
            isStreaming={isStreaming}
            label={STATUS_LABELS[status]}
            onCancel={cancel}
            status={status}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTION_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                shape="pill"
                disabled={isStreaming}
                onClick={() => handleSend(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>

          <div className="mt-3">
            <PromptInputBox
              isLoading={isStreaming}
              onSend={handleSend}
              placeholder="再加一个定价页、把 hero 改成品牌渐变、生成 README…"
            />
          </div>
        </footer>
      </section>
    </AnimateIn>
  );
}

function PlanArea({
  hasPlan,
  isStreaming,
  plan,
}: {
  hasPlan: boolean;
  isStreaming: boolean;
  plan: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-6 bg-neutral-1 p-4">
      <div className="flex items-center gap-2">
        <Lightning className="size-4 text-neutral-10" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-9">Plan</h3>
        {isStreaming ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-9">
            <span
              className="size-1.5 animate-pulse rounded-full"
              style={{ background: "var(--brand-accent)" }}
              aria-hidden="true"
            />
            streaming
          </span>
        ) : null}
      </div>
      {hasPlan ? (
        <div
          data-testid="startup-chat-plan"
          className="prose prose-sm mt-3 max-w-none text-sm leading-6 text-neutral-11"
        >
          <Streamdown>{plan}</Streamdown>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-neutral-9">
          Describe a change to start building your workspace.
        </p>
      )}
    </div>
  );
}

function FileEventList({
  events,
  isStreaming,
}: {
  events: UseStartupConversationResult["fileEvents"];
  isStreaming: boolean;
}) {
  // While the turn is live, the most recent file event is the one being written
  // *right now* — surface it as an active "Writing" affordance with a pulsing
  // dot, and settle every earlier row to its committed action. Once the turn
  // ends, nothing is active and all rows read as settled writes.
  const activeIndex = isStreaming ? events.length - 1 : -1;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-9">
          {isStreaming ? "Writing files" : "Files written"}
        </h3>
        <Badge variant="secondary" size="sm" className="tabular-nums">
          {events.length}
        </Badge>
      </div>
      <AnimateInGroup stagger="fast" className="grid gap-1.5">
        {events.map((event, index) => {
          const isActive = index === activeIndex;
          return (
            <AnimateIn
              // File paths can repeat across a turn; pair with index for a stable key.
              key={`${event.path}-${index}`}
              preset="fadeUp"
            >
              <div
                data-testid="startup-chat-file"
                data-state={isActive ? "writing" : "written"}
                className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-neutral-6 bg-neutral-2 px-3 py-2"
              >
                {isActive ? (
                  <span
                    className="size-2 shrink-0 animate-pulse rounded-full"
                    style={{ background: "var(--brand-accent)" }}
                    aria-hidden="true"
                  />
                ) : (
                  <FileText
                    className="size-4 shrink-0"
                    style={{ color: "hsl(var(--primary))" }}
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] leading-5 text-neutral-11">
                  {event.path}
                </span>
                {isActive ? (
                  <span
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    Writing
                  </span>
                ) : (
                  <span
                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
                    style={{
                      borderColor: "color-mix(in srgb, var(--status-success) 25%, transparent)",
                      color: "var(--status-success)",
                    }}
                  >
                    {event.action}
                  </span>
                )}
              </div>
            </AnimateIn>
          );
        })}
      </AnimateInGroup>
    </div>
  );
}

function ArtifactEventList({ events }: { events: UseStartupConversationResult["artifactEvents"] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-9">
        Artifacts touched
      </h3>
      <div className="flex flex-wrap gap-2">
        {events.map((event, index) => (
          <span
            key={`${event.kind}-${index}`}
            data-testid="startup-chat-artifact"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-primary"
          >
            <Sparkles className="size-3" aria-hidden="true" />
            {event.kind}
            {event.status ? <span className="opacity-60">/ {event.status}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * User message bubble with a Lovable-style "revert and resend": edit the message,
 * revert the workspace to the snapshot taken before that turn (real /revert
 * endpoint), then re-run the edited instruction from that state.
 */
function UserMessage({
  prompt,
  turnId,
  projectId,
  canRevert,
  onResend,
  onReverted,
}: {
  prompt: string;
  turnId: string | null;
  projectId: string;
  canRevert: boolean;
  onResend: (next: string) => void;
  onReverted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prompt);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // Re-sync when the live turn's prompt changes (e.g. after a resend).
  useEffect(() => {
    setDraft(prompt);
    setEditing(false);
  }, [prompt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — non-fatal */
    }
  };

  const revertAndResend = async () => {
    const next = draft.trim();
    if (!next || busy || !turnId) return;
    setBusy(true);
    try {
      const res = await fetch(
        resolveApiUrl(`/api/startup-os/projects/${encodeURIComponent(projectId)}/revert`),
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ turnId }),
        },
      );
      if (res.ok) {
        onReverted(); // reload the reverted workspace
        setEditing(false);
        onResend(next); // re-run from the reverted state
      }
    } catch {
      /* surfaced via the disabled button resetting below */
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="rounded-2xl border border-neutral-6 bg-neutral-2 p-3">
        <p className="text-xs font-semibold text-neutral-12">Revert and resend message?</p>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          aria-label="Edit message"
          className="mt-2"
        />
        <p className="mt-2 text-[11px] leading-4 text-neutral-9">
          Your message will be updated and the conversation continues from here — the workspace
          reverts to before this turn, then re-runs.
        </p>
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            shape="pill"
            onClick={() => {
              setEditing(false);
              setDraft(prompt);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ink"
            size="sm"
            shape="pill"
            disabled={busy || draft.trim().length === 0}
            onClick={() => void revertAndResend()}
          >
            {busy ? "Reverting…" : "Revert and resend"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="max-w-[85%] rounded-2xl border border-neutral-6 bg-neutral-2 px-3 py-2 text-sm text-neutral-12">
        {prompt}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {canRevert ? (
          <button
            type="button"
            aria-label="Edit and resend"
            title="Edit and resend"
            onClick={() => setEditing(true)}
            className="flex size-7 items-center justify-center rounded-md text-neutral-9 transition-colors hover:bg-neutral-3"
          >
            <PencilEdit className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy"}
          title="Copy"
          onClick={() => void copy()}
          className="flex size-7 items-center justify-center rounded-md text-neutral-9 transition-colors hover:bg-neutral-3"
        >
          {copied ? (
            <Check className="size-3.5 text-success" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}m ${total % 60}s`;
}

/** Persist a thumbs up/down on the AI response as a real FeedbackReport. */
async function recordSummaryFeedback(vote: "up" | "down", text: string) {
  await fetch(resolveApiUrl("/api/feedback"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      area: "chat",
      mode: "chat",
      description: `[Startup OS · ${vote === "up" ? "helpful" : "not helpful"}] ${text}`.slice(
        0,
        9000,
      ),
    }),
  });
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-7 items-center justify-center rounded-md text-neutral-9 transition-colors hover:bg-neutral-3 disabled:cursor-default disabled:opacity-60 ${active ? "bg-neutral-3" : ""}`}
    >
      {children}
    </button>
  );
}

/**
 * AI response — bubble-less plain text with a Lovable-style action toolbar.
 * Every value is real: copy uses the response text, the thumbs persist a
 * FeedbackReport via /api/feedback, and the metadata (worked-for duration, token
 * usage) comes from the streamed turn.
 */
function SummaryCard({
  summary,
  durationMs,
}: {
  summary: StartupConversationSummary;
  durationMs: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary.summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — non-fatal */
    }
  };

  const sendVote = async (next: "up" | "down") => {
    if (voting || vote) return;
    setVoting(true);
    try {
      await recordSummaryFeedback(next, summary.summary);
      setVote(next);
    } catch {
      /* feedback is best-effort */
    } finally {
      setVoting(false);
    }
  };

  const meta = [
    durationMs ? `Worked for ${formatDuration(durationMs)}` : null,
    summary.totalTokens > 0 ? `${summary.totalTokens.toLocaleString()} tokens` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AnimateIn preset="fadeUp">
      <div data-testid="startup-chat-summary" className="px-1">
        <div className="flex items-start gap-2.5">
          <CheckCircle
            className="mt-0.5 size-4 shrink-0"
            style={{ color: "var(--status-success)" }}
            aria-hidden="true"
          />
          <p className="text-sm leading-6 text-neutral-11">{summary.summary}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 pl-6">
          <ToolbarButton label={copied ? "Copied" : "Copy"} onClick={() => void copy()}>
            {copied ? (
              <Check className="size-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
          </ToolbarButton>
          <ToolbarButton
            label="Helpful"
            active={vote === "up"}
            disabled={Boolean(vote) || voting}
            onClick={() => void sendVote("up")}
          >
            <ThumbUp
              className={`size-3.5 ${vote === "up" ? "text-success" : ""}`}
              aria-hidden="true"
            />
          </ToolbarButton>
          <ToolbarButton
            label="Not helpful"
            active={vote === "down"}
            disabled={Boolean(vote) || voting}
            onClick={() => void sendVote("down")}
          >
            <ThumbDown
              className={`size-3.5 ${vote === "down" ? "text-[color:var(--status-danger)]" : ""}`}
              aria-hidden="true"
            />
          </ToolbarButton>
          {meta ? <span className="ml-1.5 text-[11px] text-neutral-9">{meta}</span> : null}
        </div>
      </div>
    </AnimateIn>
  );
}

function StatusRow({
  isStreaming,
  label,
  onCancel,
  status,
}: {
  isStreaming: boolean;
  label: string;
  onCancel: () => void;
  status: UseStartupConversationResult["status"];
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-neutral-10">
        <span
          className={`size-1.5 rounded-full ${isStreaming ? "animate-pulse" : ""}`}
          style={{
            background:
              status === "error"
                ? "var(--status-danger)"
                : status === "done"
                  ? "var(--status-success)"
                  : isStreaming
                    ? "var(--brand-accent)"
                    : "hsl(var(--border))",
          }}
          aria-hidden="true"
        />
        {label}
      </span>
      {isStreaming ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          shape="pill"
          onClick={onCancel}
          aria-label="Stop generating"
        >
          <StopFill className="size-3.5" aria-hidden="true" />
          Stop
        </Button>
      ) : null}
    </div>
  );
}
