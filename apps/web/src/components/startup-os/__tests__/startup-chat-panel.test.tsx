// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  StartupConversationSummary,
  UseStartupConversationResult,
} from "../use-startup-conversation";

// ─── Module stubs ─────────────────────────────────────────────────────────────
// The real @nebutra/ui barrels pull heavyweight deps (emoji-mart JSON imports,
// framer-motion, shiki via streamdown) that vitest cannot resolve cheaply. We
// only need lightweight stand-ins that preserve the contract the panel relies
// on: AnimateIn passes children through, PromptInputBox surfaces a composer that
// calls `onSend`, and the Alert/icon primitives render their content.

let lastPromptInputProps: { isLoading?: boolean } | null = null;

vi.mock("@nebutra/ui/components", () => ({
  AnimateIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AnimateInGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PromptInputBox: ({
    onSend,
    isLoading,
    placeholder,
  }: {
    onSend?: (message: string, files?: File[]) => void;
    isLoading?: boolean;
    placeholder?: string;
  }) => {
    lastPromptInputProps = { isLoading };
    return (
      <div data-testid="prompt-input-box">
        <textarea
          aria-label="Conversation composer"
          placeholder={placeholder}
          data-testid="composer-textarea"
        />
        <button
          type="button"
          data-testid="composer-send"
          onClick={() => {
            const node = screen.getByTestId<HTMLTextAreaElement>("composer-textarea");
            onSend?.(node.value);
          }}
        >
          send
        </button>
      </div>
    );
  },
}));

vi.mock("@nebutra/ui/primitives", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertIcon: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  ),
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock("@nebutra/icons", () => {
  const Stub = ({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) => (
    <svg aria-hidden={ariaHidden} />
  );
  return {
    Check: Stub,
    CheckCircle: Stub,
    Copy: Stub,
    PencilEdit: Stub,
    FileText: Stub,
    Lightning: Stub,
    Sparkles: Stub,
    StopFill: Stub,
    ThumbDown: Stub,
    ThumbUp: Stub,
    Warning: Stub,
  };
});

// Streamdown renders the streamed markdown plan — a passthrough is enough to
// assert the plain plan text is on screen.
vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { StartupChatPanel } from "../startup-chat-panel";

// ─── Fake hook factory ────────────────────────────────────────────────────────

function makeConversation(
  overrides: Partial<UseStartupConversationResult> = {},
): UseStartupConversationResult {
  return {
    status: "idle",
    isStreaming: false,
    plan: "",
    fileEvents: [],
    artifactEvents: [],
    summary: null,
    startedAt: null,
    durationMs: null,
    turnId: null,
    userPrompt: null,
    error: null,
    send: vi.fn(async () => {}),
    cancel: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function makeSummary(
  overrides: Partial<StartupConversationSummary> = {},
): StartupConversationSummary {
  return {
    summary: "Added a pricing page and restyled the hero.",
    fileCount: 2,
    artifactCount: 1,
    provider: "test",
    model: "fast",
    totalTokens: 42,
    ...overrides,
  };
}

const STREAMING_STATE: Partial<UseStartupConversationResult> = {
  status: "streaming",
  isStreaming: true,
  plan: "I will add a pricing page and switch the hero to the brand gradient.",
  fileEvents: [
    {
      type: "file",
      path: "src/PricingPage.tsx",
      language: "tsx",
      action: "updated",
      occurredAt: "t1",
    },
    { type: "file", path: "src/Hero.tsx", language: "tsx", action: "updated", occurredAt: "t2" },
  ],
  artifactEvents: [
    { type: "artifact", kind: "landing_page", status: "ready", summary: "Hero restyled" },
  ],
};

afterEach(() => {
  cleanup();
  lastPromptInputProps = null;
});

describe("StartupChatPanel", () => {
  it("renders the streamed plan prose", () => {
    render(
      <StartupChatPanel projectId="proj_1" conversation={makeConversation(STREAMING_STATE)} />,
    );
    expect(screen.getByTestId("startup-chat-plan")).toHaveTextContent(
      "I will add a pricing page and switch the hero to the brand gradient.",
    );
  });

  it("renders a file chip per streamed file event", () => {
    render(
      <StartupChatPanel projectId="proj_1" conversation={makeConversation(STREAMING_STATE)} />,
    );
    const chips = screen.getAllByTestId("startup-chat-file");
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent("src/PricingPage.tsx");
    expect(chips[1]).toHaveTextContent("src/Hero.tsx");
  });

  it("renders the prompt composer and suggestion chips", () => {
    render(<StartupChatPanel projectId="proj_1" conversation={makeConversation()} />);
    expect(screen.getByTestId("prompt-input-box")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再加一个定价页" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "把 hero 改成品牌渐变" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成 README" })).toBeInTheDocument();
  });

  it("shows the stop/cancel button while streaming and wires it to cancel()", () => {
    const cancel = vi.fn();
    render(
      <StartupChatPanel
        projectId="proj_1"
        conversation={makeConversation({ ...STREAMING_STATE, cancel })}
      />,
    );
    const stop = screen.getByRole("button", { name: "Stop generating" });
    expect(stop).toBeInTheDocument();
    fireEvent.click(stop);
    expect(cancel).toHaveBeenCalledTimes(1);
    // The composer is flagged as loading while a turn is in flight.
    expect(lastPromptInputProps?.isLoading).toBe(true);
  });

  it("hides the stop button when idle", () => {
    render(<StartupChatPanel projectId="proj_1" conversation={makeConversation()} />);
    expect(screen.queryByRole("button", { name: "Stop generating" })).toBeNull();
  });

  it("calls send() with the typed instruction on submit", () => {
    const send = vi.fn(async () => {});
    render(<StartupChatPanel projectId="proj_1" conversation={makeConversation({ send })} />);

    fireEvent.change(screen.getByTestId("composer-textarea"), {
      target: { value: "把 hero 改成品牌渐变" },
    });
    fireEvent.click(screen.getByTestId("composer-send"));

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("把 hero 改成品牌渐变");
  });

  it("calls send() from a suggestion chip", () => {
    const send = vi.fn(async () => {});
    render(<StartupChatPanel projectId="proj_1" conversation={makeConversation({ send })} />);

    fireEvent.click(screen.getByRole("button", { name: "生成 README" }));
    expect(send).toHaveBeenCalledWith("生成 README");
  });

  it("renders the summary card once a turn completes", () => {
    render(
      <StartupChatPanel
        projectId="proj_1"
        conversation={makeConversation({
          status: "done",
          summary: {
            summary: "Added a pricing page and restyled the hero.",
            fileCount: 2,
            artifactCount: 1,
            provider: "test",
            model: "fast",
            totalTokens: 42,
          },
        })}
      />,
    );
    expect(screen.getByTestId("startup-chat-summary")).toHaveTextContent(
      "Added a pricing page and restyled the hero.",
    );
  });

  it("surfaces an error alert when the turn fails", () => {
    render(
      <StartupChatPanel
        projectId="proj_1"
        conversation={makeConversation({
          status: "error",
          error: "Model response was not valid JSON.",
        })}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Conversation failed");
    expect(alert).toHaveTextContent("Model response was not valid JSON.");
  });

  it("does not call send() for an empty submission", () => {
    const send = vi.fn(async () => {});
    render(<StartupChatPanel projectId="proj_1" conversation={makeConversation({ send })} />);
    fireEvent.click(screen.getByTestId("composer-send"));
    expect(send).not.toHaveBeenCalled();
  });

  it("marks the most recent file as 'writing' while the turn streams", () => {
    render(
      <StartupChatPanel projectId="proj_1" conversation={makeConversation(STREAMING_STATE)} />,
    );
    const chips = screen.getAllByTestId("startup-chat-file");
    // Earlier rows are settled; only the last in-flight write is active.
    expect(chips[0]).toHaveAttribute("data-state", "written");
    expect(chips[1]).toHaveAttribute("data-state", "writing");
    expect(chips[1]).toHaveTextContent("Writing");
  });

  it("settles every file row to 'written' once the turn is done", () => {
    render(
      <StartupChatPanel
        projectId="proj_1"
        conversation={makeConversation({
          ...STREAMING_STATE,
          status: "done",
          isStreaming: false,
          summary: makeSummary(),
        })}
      />,
    );
    for (const chip of screen.getAllByTestId("startup-chat-file")) {
      expect(chip).toHaveAttribute("data-state", "written");
    }
  });
});

describe("StartupChatPanel onApplied loop closure", () => {
  it("fires onApplied once when a turn completes with file changes", () => {
    const onApplied = vi.fn();
    render(
      <StartupChatPanel
        projectId="proj_1"
        onApplied={onApplied}
        conversation={makeConversation({ status: "done", summary: makeSummary({ fileCount: 2 }) })}
      />,
    );
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it("does not re-fire onApplied on a re-render of the same completed turn", () => {
    const onApplied = vi.fn();
    const done = makeConversation({ status: "done", summary: makeSummary({ fileCount: 2 }) });
    const { rerender } = render(
      <StartupChatPanel projectId="proj_1" onApplied={onApplied} conversation={done} />,
    );
    // Re-render with the *same* completed turn — the latch must hold.
    rerender(<StartupChatPanel projectId="proj_1" onApplied={onApplied} conversation={done} />);
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it("does not fire onApplied when the turn fails", () => {
    const onApplied = vi.fn();
    render(
      <StartupChatPanel
        projectId="proj_1"
        onApplied={onApplied}
        conversation={makeConversation({ status: "error", error: "boom" })}
      />,
    );
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("does not fire onApplied for a completed turn that changed no files", () => {
    const onApplied = vi.fn();
    render(
      <StartupChatPanel
        projectId="proj_1"
        onApplied={onApplied}
        conversation={makeConversation({
          status: "done",
          summary: makeSummary({ fileCount: 0 }),
          fileEvents: [],
        })}
      />,
    );
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("fires onApplied again on the next completed turn (latch re-arms)", () => {
    const onApplied = vi.fn();
    const { rerender } = render(
      <StartupChatPanel
        projectId="proj_1"
        onApplied={onApplied}
        conversation={makeConversation({ status: "done", summary: makeSummary({ fileCount: 1 }) })}
      />,
    );
    expect(onApplied).toHaveBeenCalledTimes(1);

    // A new turn starts (streaming re-arms the latch), then completes again.
    rerender(
      <StartupChatPanel
        projectId="proj_1"
        onApplied={onApplied}
        conversation={makeConversation({ status: "streaming", isStreaming: true })}
      />,
    );
    rerender(
      <StartupChatPanel
        projectId="proj_1"
        onApplied={onApplied}
        conversation={makeConversation({ status: "done", summary: makeSummary({ fileCount: 3 }) })}
      />,
    );
    expect(onApplied).toHaveBeenCalledTimes(2);
  });
});
