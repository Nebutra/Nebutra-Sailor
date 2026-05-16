import {
  Robot as Bot,
  LoaderCircle as Loader2,
  PaperAirplane as Send,
  Trash as Trash2,
  User,
} from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";

/* ---------------------------------------------------------------------------
 * Visual-only story components
 *
 * The real ChatInterface depends on @ai-sdk/react useChat + DefaultChatTransport
 * which cannot run inside Storybook without a backend. These lightweight
 * markup replicas reproduce the visual design so designers and reviewers can
 * inspect layout, spacing, and theming without provider boilerplate.
 * -------------------------------------------------------------------------- */

interface StaticMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function MessageBubble({ message }: { message: StaticMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-blue-3 text-blue-11" : "bg-neutral-3 text-neutral-11"
        }`}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? "bg-blue-9 text-[color:var(--neutral-1)]" : "bg-neutral-3 text-neutral-12"
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{message.text}</div>
      </div>
    </div>
  );
}

function ChatShell({
  children,
  showClear = false,
  inputDisabled = false,
  inputValue = "",
}: {
  children: React.ReactNode;
  showClear?: boolean;
  inputDisabled?: boolean;
  inputValue?: string;
}) {
  return (
    <div className="flex h-[480px] flex-col rounded-xl border border-neutral-7 bg-neutral-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-7 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-blue-10" />
          <h2 className="text-sm font-semibold text-neutral-12">Sailor AI Assistant</h2>
        </div>
        {showClear && (
          <button
            type="button"
            aria-label="Clear conversation"
            className="rounded-md p-1.5 text-neutral-10 transition-colors hover:bg-neutral-2 hover:text-neutral-12"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>

      {/* Input */}
      <div className="border-t border-neutral-7 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={inputValue}
            placeholder="Type a message…"
            disabled={inputDisabled}
            className="flex-1 rounded-lg border border-neutral-7 bg-neutral-2 px-3 py-2 text-sm text-neutral-12 placeholder:text-neutral-10 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            disabled={!inputValue || inputDisabled}
            aria-label="Send message"
            className="rounded-lg bg-blue-9 px-3 py-2 text-[color:var(--neutral-1)] transition-colors hover:bg-blue-10 disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* -- Wrapper component for Storybook meta -------------------------------- */

function ChatInterfaceVisual() {
  return (
    <ChatShell>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Bot className="size-12 text-neutral-7" />
        <h3 className="mt-4 text-sm font-medium text-neutral-12">How can I help you?</h3>
        <p className="mt-1 max-w-sm text-sm text-neutral-11">
          Ask me anything about your SaaS platform, data, or features.
        </p>
      </div>
    </ChatShell>
  );
}

/* -- Meta ---------------------------------------------------------------- */

const meta: Meta<typeof ChatInterfaceVisual> = {
  title: "Patterns/ChatInterface",
  component: ChatInterfaceVisual,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "AI chat interface used in the web dashboard. Renders user and assistant message bubbles with a streaming-aware input bar. " +
          "These stories are visual-only replicas — the real component relies on `@ai-sdk/react` `useChat` which requires a backend.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ChatInterfaceVisual>;

/* -- Stories ------------------------------------------------------------- */

const sampleMessages: StaticMessage[] = [
  {
    id: "1",
    role: "user",
    text: "How many active users did we have last month?",
  },
  {
    id: "2",
    role: "assistant",
    text: "Based on your analytics data, you had 12,847 active users last month — a 14% increase from the previous month. The biggest growth came from the Asia-Pacific region.",
  },
  {
    id: "3",
    role: "user",
    text: "Can you break that down by plan tier?",
  },
  {
    id: "4",
    role: "assistant",
    text: "Here's the breakdown by plan tier:\n\n• Free: 8,231 users (64%)\n• Pro: 3,412 users (27%)\n• Enterprise: 1,204 users (9%)\n\nThe Pro tier saw the highest growth rate at 22% month-over-month.",
  },
];

export const EmptyState: Story = {
  name: "Empty State",
  render: () => (
    <ChatShell>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Bot className="size-12 text-neutral-7" />
        <h3 className="mt-4 text-sm font-medium text-neutral-12">How can I help you?</h3>
        <p className="mt-1 max-w-sm text-sm text-neutral-11">
          Ask me anything about your SaaS platform, data, or features.
        </p>
      </div>
    </ChatShell>
  ),
};

export const WithMessages: Story = {
  name: "With Messages",
  render: () => (
    <ChatShell showClear>
      <div className="space-y-4">
        {sampleMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
    </ChatShell>
  ),
};

export const Streaming: Story = {
  name: "Streaming (Thinking)",
  render: () => (
    <ChatShell showClear inputDisabled>
      <div className="space-y-4">
        <MessageBubble
          message={{ id: "1", role: "user", text: "Summarize last week's revenue." }}
        />
        {/* Streaming indicator */}
        <div className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-3 text-neutral-11">
            <Bot className="size-4" />
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-neutral-3 px-4 py-2.5">
            <Loader2 className="size-4 animate-spin text-neutral-11" />
            <span className="text-sm text-neutral-11">Thinking…</span>
          </div>
        </div>
      </div>
    </ChatShell>
  ),
};

export const LongConversation: Story = {
  name: "Long Conversation",
  render: () => {
    const longMessages: StaticMessage[] = [
      { id: "1", role: "user", text: "Hi, I need help setting up billing." },
      {
        id: "2",
        role: "assistant",
        text: "Of course! I can help you configure billing for your organization. What billing provider are you using — Stripe, Paddle, or something else?",
      },
      { id: "3", role: "user", text: "We use Stripe." },
      {
        id: "4",
        role: "assistant",
        text: "Great choice. To integrate Stripe, you'll need to:\n\n1. Add your Stripe secret key to the environment variables\n2. Configure the webhook endpoint\n3. Set up your product and price IDs\n\nWould you like me to walk you through each step?",
      },
      { id: "5", role: "user", text: "Yes, let's start with the webhook." },
      {
        id: "6",
        role: "assistant",
        text: 'Navigate to Settings > Integrations > Stripe in your dashboard. You\'ll see a "Webhook URL" field — copy that URL and paste it into your Stripe dashboard under Developers > Webhooks > Add endpoint.\n\nMake sure to subscribe to these events:\n• checkout.session.completed\n• customer.subscription.updated\n• customer.subscription.deleted\n• invoice.payment_succeeded\n• invoice.payment_failed',
      },
      { id: "7", role: "user", text: "Done. What's next?" },
      {
        id: "8",
        role: "assistant",
        text: "Now let's configure your products. Go to your Stripe dashboard and create a Product for each plan tier (Free, Pro, Enterprise). For each product, create a recurring Price.\n\nOnce created, copy each Price ID (starts with price_) and add them to your environment variables as STRIPE_PRICE_PRO and STRIPE_PRICE_ENTERPRISE.",
      },
    ];

    return (
      <ChatShell showClear>
        <div className="space-y-4">
          {longMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      </ChatShell>
    );
  },
};

export const AllVariants: Story = {
  name: "All Variants",
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-12">Empty State</h3>
        <ChatShell>
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="size-12 text-neutral-7" />
            <h3 className="mt-4 text-sm font-medium text-neutral-12">How can I help you?</h3>
            <p className="mt-1 max-w-sm text-sm text-neutral-11">
              Ask me anything about your SaaS platform, data, or features.
            </p>
          </div>
        </ChatShell>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-12">With Messages</h3>
        <ChatShell showClear>
          <div className="space-y-4">
            {sampleMessages.slice(0, 2).map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        </ChatShell>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-12">Streaming</h3>
        <ChatShell showClear inputDisabled>
          <div className="space-y-4">
            <MessageBubble message={{ id: "s1", role: "user", text: "What is our churn rate?" }} />
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-3 text-neutral-11">
                <Bot className="size-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-neutral-3 px-4 py-2.5">
                <Loader2 className="size-4 animate-spin text-neutral-11" />
                <span className="text-sm text-neutral-11">Thinking…</span>
              </div>
            </div>
          </div>
        </ChatShell>
      </div>
    </div>
  ),
};
