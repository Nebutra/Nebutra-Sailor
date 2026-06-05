"use client";

import { CheckCircle, FileText, Lightning, Sparkles, StopFill, Warning } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup, PromptInputBox } from "@nebutra/ui/components";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@nebutra/ui/primitives";
import { Streamdown } from "streamdown";
import {
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
}

const SUGGESTION_PROMPTS = ["再加一个定价页", "把 hero 改成品牌渐变", "生成 README"] as const;

const STATUS_LABELS: Record<UseStartupConversationResult["status"], string> = {
  idle: "Ready when you are",
  streaming: "Building your changes",
  done: "Changes applied",
  error: "The turn failed",
  cancelled: "Turn cancelled",
};

export function StartupChatPanel({ projectId, conversation }: StartupChatPanelProps) {
  // Hooks must run unconditionally; the injected result simply shadows the live
  // one for tests. Both calls are cheap and side-effect-free until `send`.
  const live = useStartupConversation({ projectId });
  const state = conversation ?? live;

  const { status, isStreaming, plan, fileEvents, artifactEvents, summary, error, send, cancel } =
    state;

  const hasPlan = plan.trim().length > 0;
  const handleSend = (message: string) => {
    const instruction = message.trim();
    if (instruction.length === 0 || isStreaming) return;
    void send(instruction);
  };

  return (
    <AnimateIn preset="emerge">
      <section
        aria-label="Startup OS conversational build"
        className="flex h-full min-h-0 flex-col bg-neutral-1 text-neutral-12"
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-neutral-6 px-5 py-4">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-lg)] text-white"
            style={{ background: "var(--brand-gradient)" }}
            aria-hidden="true"
          >
            <Sparkles className="size-4.5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-[-0.02em] text-neutral-12">
              Build with conversation
            </h2>
            <p className="mt-0.5 truncate text-xs text-neutral-10">
              Describe a change and the agent edits your workspace live.
            </p>
          </div>
        </header>

        {/* Scrollable stream */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <PlanArea hasPlan={hasPlan} isStreaming={isStreaming} plan={plan} />

          {fileEvents.length > 0 ? <FileEventList events={fileEvents} /> : null}

          {artifactEvents.length > 0 ? <ArtifactEventList events={artifactEvents} /> : null}

          {summary ? <SummaryCard summary={summary.summary} /> : null}

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

        {/* Composer footer */}
        <footer className="border-t border-neutral-6 bg-neutral-1 px-5 py-4">
          <StatusRow
            isStreaming={isStreaming}
            label={STATUS_LABELS[status]}
            onCancel={cancel}
            status={status}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTION_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isStreaming}
                onClick={() => handleSend(prompt)}
                className="rounded-full border border-neutral-6 bg-neutral-1 px-3 py-1.5 text-xs font-medium text-neutral-11 transition-colors hover:bg-neutral-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {prompt}
              </button>
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
    <div className="rounded-[20px] border border-neutral-6 bg-neutral-1 p-4">
      <div className="flex items-center gap-2">
        <Lightning className="size-4 text-neutral-10" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-9">Plan</h3>
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
          The founder-facing plan will appear here as the agent thinks.
        </p>
      )}
    </div>
  );
}

function FileEventList({ events }: { events: UseStartupConversationResult["fileEvents"] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-9">
        Files written
      </h3>
      <AnimateInGroup stagger="fast" className="grid gap-1.5">
        {events.map((event, index) => (
          <AnimateIn
            // File paths can repeat across a turn; pair with index for a stable key.
            key={`${event.path}-${index}`}
            preset="fadeUp"
          >
            <div
              data-testid="startup-chat-file"
              className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-neutral-6 bg-neutral-2 px-3 py-2"
            >
              <FileText
                className="size-4 shrink-0"
                style={{ color: "var(--brand-primary)" }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] leading-5 text-neutral-11">
                {event.path}
              </span>
              <span
                className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  borderColor: "hsl(var(--success) / 0.25)",
                  color: "var(--status-success)",
                }}
              >
                {event.action}
              </span>
            </div>
          </AnimateIn>
        ))}
      </AnimateInGroup>
    </div>
  );
}

function ArtifactEventList({ events }: { events: UseStartupConversationResult["artifactEvents"] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-9">
        Artifacts touched
      </h3>
      <div className="flex flex-wrap gap-2">
        {events.map((event, index) => (
          <span
            key={`${event.kind}-${index}`}
            data-testid="startup-chat-artifact"
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-6 bg-blue-2 px-2.5 py-1 text-[11px] font-medium text-blue-11 dark:border-blue-8/40 dark:bg-blue-9/15 dark:text-blue-4"
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

function SummaryCard({ summary }: { summary: string }) {
  return (
    <AnimateIn preset="fadeUp">
      <div
        data-testid="startup-chat-summary"
        className="flex items-start gap-2.5 rounded-[20px] border border-neutral-6 bg-neutral-2 p-4"
      >
        <CheckCircle
          className="mt-0.5 size-4 shrink-0"
          style={{ color: "var(--status-success)" }}
          aria-hidden="true"
        />
        <p className="text-sm leading-6 text-neutral-11">{summary}</p>
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
                    : "var(--neutral-8)",
          }}
          aria-hidden="true"
        />
        {label}
      </span>
      {isStreaming ? (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Stop generating"
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-6 bg-neutral-1 px-3 py-1.5 text-xs font-semibold text-neutral-11 transition-colors hover:bg-neutral-2"
        >
          <StopFill className="size-3.5" aria-hidden="true" />
          Stop
        </button>
      ) : null}
    </div>
  );
}
