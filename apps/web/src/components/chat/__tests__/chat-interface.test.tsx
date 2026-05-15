// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- i18n mock --------------------------------------------------------------
const messages: Record<string, string> = {
  "chat.suggestions.title": "Try one of these to get started",
  "chat.suggestions.activity.title": "Show recent activity",
  "chat.suggestions.activity.prompt":
    "Show me the most recent activity across my workspace from the past 24 hours.",
  "chat.suggestions.debug.title": "Debug an error",
  "chat.suggestions.debug.prompt":
    "Help me debug a runtime error. I will paste the stack trace and you can guide me through it.",
  "chat.suggestions.email.title": "Draft a summary email",
  "chat.suggestions.email.prompt":
    "Draft a concise weekly summary email I can send to my team about platform progress.",
  "chat.suggestions.features.title": "Explore platform features",
  "chat.suggestions.features.prompt":
    "Walk me through the key features of this SaaS platform and how I can use them.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// ---- streamdown mock --------------------------------------------------------
// Avoid pulling streamdown's full markdown/highlighting deps into jsdom tests.
vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children?: ReactNode }) => (
    <div data-testid="streamdown">{children}</div>
  ),
}));

// ---- @nebutra/ui mock -------------------------------------------------------
// AnimateIn pulls framer-motion + brand pkg; render children directly.
vi.mock("@nebutra/ui/components", () => ({
  AnimateIn: ({ children }: { children?: ReactNode }) => <>{children}</>,
  AnimateInGroup: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

// ---- ai SDK mock ------------------------------------------------------------
type Part = { type: "text"; text: string };
type Msg = { id: string; role: "user" | "assistant"; parts: Part[] };

const sendMessageMock = vi.fn();
const setMessagesMock = vi.fn();
let mockMessages: Msg[] = [];
let mockStatus: "ready" | "streaming" | "submitted" = "ready";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: mockMessages,
    sendMessage: sendMessageMock,
    setMessages: setMessagesMock,
    status: mockStatus,
  }),
}));

vi.mock("ai", () => ({
  DefaultChatTransport: vi.fn(),
}));

// Now import the component under test (after mocks are registered)
import { ChatInterface } from "../chat-interface";

beforeEach(() => {
  sendMessageMock.mockReset();
  setMessagesMock.mockReset();
  mockMessages = [];
  mockStatus = "ready";
});

afterEach(() => {
  cleanup();
});

describe("ChatInterface — prompt suggestions", () => {
  it("renders 4 suggestion cards when there are no messages", () => {
    render(<ChatInterface />);
    expect(screen.getByText("Show recent activity")).toBeInTheDocument();
    expect(screen.getByText("Debug an error")).toBeInTheDocument();
    expect(screen.getByText("Draft a summary email")).toBeInTheDocument();
    expect(screen.getByText("Explore platform features")).toBeInTheDocument();
    // Title is also visible
    expect(screen.getByText("Try one of these to get started")).toBeInTheDocument();
  });

  it("invokes sendMessage with the card prompt when a suggestion is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatInterface />);

    await user.click(screen.getByRole("button", { name: /show recent activity/i }));

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith(
      { text: messages["chat.suggestions.activity.prompt"] },
      expect.anything(),
    );
  });

  it("hides suggestions once messages.length > 0", () => {
    mockMessages = [{ id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] }];
    render(<ChatInterface />);
    expect(screen.queryByText("Show recent activity")).not.toBeInTheDocument();
    expect(screen.queryByText("Try one of these to get started")).not.toBeInTheDocument();
  });
});

describe("ChatInterface — multiline textarea", () => {
  it("submits when Enter is pressed without Shift", async () => {
    const user = userEvent.setup();
    render(<ChatInterface />);

    const textarea = screen.getByPlaceholderText(/type a message/i) as HTMLTextAreaElement;
    await user.type(textarea, "hello");
    expect(textarea.value).toBe("hello");

    fireEvent.keyDown(textarea, { key: "Enter", code: "Enter", shiftKey: false });

    expect(sendMessageMock).toHaveBeenCalledWith({ text: "hello" }, expect.anything());
  });

  it("inserts a newline and does NOT submit when Shift+Enter is pressed", async () => {
    const user = userEvent.setup();
    render(<ChatInterface />);

    const textarea = screen.getByPlaceholderText(/type a message/i) as HTMLTextAreaElement;
    await user.type(textarea, "hello");
    fireEvent.keyDown(textarea, { key: "Enter", code: "Enter", shiftKey: true });

    expect(sendMessageMock).not.toHaveBeenCalled();
    // textarea retains its value (no submission), and shift+enter naturally
    // adds \n in real browsers; we at least verify the value is still present.
    expect(textarea.value).toContain("hello");
  });
});

describe("ChatInterface — markdown rendering", () => {
  it("renders assistant message content through Streamdown", () => {
    mockMessages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Hi" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "**bold reply**" }],
      },
    ];
    render(<ChatInterface />);

    const streamdownNodes = screen.getAllByTestId("streamdown");
    // At minimum, the assistant message text passes through Streamdown.
    const haystack = streamdownNodes.map((n) => n.textContent ?? "").join("|");
    expect(haystack).toContain("**bold reply**");
  });
});
