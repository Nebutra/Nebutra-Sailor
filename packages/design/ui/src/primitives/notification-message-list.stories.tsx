import type { Meta, StoryObj } from "@storybook/react";
import type { NotificationMessage } from "./notification-message-list";
import { NotificationMessageList } from "./notification-message-list";

const messages: NotificationMessage[] = [
  {
    title: "New deployment",
    time: "2m ago",
    content: "Production deploy succeeded in 42 seconds",
    gradientColor: "from-green-400 to-emerald-600",
  },
  {
    title: "Security alert",
    time: "15m ago",
    content: "New sign-in from Berlin, Germany",
    gradientColor: "from-red-400 to-pink-600",
  },
  {
    title: "Usage limit",
    time: "1h ago",
    content: "You've used 80% of your monthly API quota",
    gradientColor: "from-amber-400 to-orange-500",
  },
  {
    title: "Team invite",
    time: "3h ago",
    content: "Jane Smith invited you to the Acme workspace",
    gradientColor: "from-blue-400 to-indigo-600",
  },
  {
    title: "PR merged",
    time: "5h ago",
    content: "#142: Add dark mode support was merged by @john",
    gradientColor: "from-purple-400 to-violet-600",
  },
];

const meta = {
  title: "Primitives/NotificationMessageList",
  component: NotificationMessageList,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Animated notification message list with staggered scale-up entrance, gradient avatars, and bottom fade overlay.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    maxHeight: { control: "text" },
    animationDelay: { control: { type: "range", min: 50, max: 600, step: 50 } },
  },
} satisfies Meta<typeof NotificationMessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    messages,
  },
};

export const FasterAnimation: Story = {
  args: {
    messages,
    animationDelay: 150,
  },
};

export const TallContainer: Story = {
  args: {
    messages,
    maxHeight: "400px",
    animationDelay: 200,
  },
};

export const FewMessages: Story = {
  args: {
    messages: messages.slice(0, 2),
    maxHeight: "160px",
  },
};

export const InCard: Story = {
  render: () => (
    <div className="w-80 rounded-xl border bg-card shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Notifications</h3>
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
          {messages.length}
        </span>
      </div>
      <NotificationMessageList messages={messages} animationDelay={200} />
    </div>
  ),
};

export const DefaultGradient: Story = {
  args: {
    messages: [
      {
        title: "System update",
        time: "1m ago",
        content: "Dependencies updated successfully",
      },
      {
        title: "Backup complete",
        time: "10m ago",
        content: "Daily backup finished: 2.3 GB",
      },
    ],
  },
};
