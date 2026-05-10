import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedList } from "./animated-list";

const meta = {
  title: "Primitives/AnimatedList",
  component: AnimatedList,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Sequential list animation — reveals children one by one with spring animation. Items accumulate newest-first (reversed display). Each child must have a stable key prop.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    delay: { control: { type: "range", min: 200, max: 3000, step: 100 } },
  },
} satisfies Meta<typeof AnimatedList>;

export default meta;
type Story = StoryObj<typeof meta>;

const notifications = [
  {
    id: "1",
    emoji: "👤",
    title: "New signup",
    body: "john@example.com joined",
  },
  {
    id: "2",
    emoji: "💳",
    title: "Payment received",
    body: "$49/mo plan activated",
  },
  {
    id: "3",
    emoji: "🚀",
    title: "Deploy completed",
    body: "v2.1.0 is live in production",
  },
  {
    id: "4",
    emoji: "⚠️",
    title: "High CPU",
    body: "Server CPU above 80% for 5m",
  },
  {
    id: "5",
    emoji: "✅",
    title: "Health check",
    body: "All systems operational",
  },
];

const NotificationCard = ({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) => (
  <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 shadow-sm w-72">
    <span className="text-xl">{emoji}</span>
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  </div>
);

export const Default: Story = {
  render: () => (
    <AnimatedList delay={800} className="w-72">
      {notifications.map((n) => (
        <NotificationCard key={n.id} emoji={n.emoji} title={n.title} body={n.body} />
      ))}
    </AnimatedList>
  ),
};

export const Fast: Story = {
  render: () => (
    <AnimatedList delay={400} className="w-72">
      {notifications.map((n) => (
        <NotificationCard key={n.id} emoji={n.emoji} title={n.title} body={n.body} />
      ))}
    </AnimatedList>
  ),
};

export const Slow: Story = {
  render: () => (
    <AnimatedList delay={1500} className="w-72">
      {notifications.slice(0, 3).map((n) => (
        <NotificationCard key={n.id} emoji={n.emoji} title={n.title} body={n.body} />
      ))}
    </AnimatedList>
  ),
};

export const SimpleItems: Story = {
  render: () => (
    <AnimatedList delay={600} className="w-48">
      {["Step 1: Initialize", "Step 2: Configure", "Step 3: Deploy", "Step 4: Monitor"].map(
        (step) => (
          <div key={step} className="rounded-lg border px-4 py-2 text-sm">
            {step}
          </div>
        ),
      )}
    </AnimatedList>
  ),
};
