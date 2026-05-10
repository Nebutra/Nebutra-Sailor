import type { Meta, StoryObj } from "@storybook/react";
import { Check } from "lucide-react";
import { MagicCard } from "./magic-card";

const meta = {
  title: "Primitives/MagicCard",
  component: MagicCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Card with a gradient spotlight and glowing border effect that follows the mouse cursor. Gradient border highlights on hover. Perfect for pricing cards and feature highlights.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    gradientSize: { control: { type: "range", min: 50, max: 400, step: 25 } },
    gradientFrom: { control: "color" },
    gradientTo: { control: "color" },
    gradientColor: { control: "color" },
    gradientOpacity: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
  },
} satisfies Meta<typeof MagicCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MagicCard className="rounded-xl p-8 cursor-pointer w-64 h-48">
      <h3 className="text-lg font-semibold">Hover me</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Move your cursor over this card to see the gradient border and spotlight.
      </p>
    </MagicCard>
  ),
};

export const PricingCard: Story = {
  render: () => (
    <MagicCard className="rounded-2xl p-8 cursor-pointer w-72">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">
        Most Popular
      </div>
      <div className="text-3xl font-bold">
        $49
        <span className="text-base font-normal text-muted-foreground">/mo</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Per workspace, billed monthly</p>
      <div className="mt-6 space-y-3">
        {["Unlimited projects", "API access", "Priority support", "Custom integrations"].map(
          (f) => (
            <div key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              {f}
            </div>
          ),
        )}
      </div>
      <button
        type="button"
        className="mt-6 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground"
      >
        Get started
      </button>
    </MagicCard>
  ),
};

export const BlueTheme: Story = {
  render: () => (
    <MagicCard
      gradientFrom="#00C6FF"
      gradientTo="#0072FF"
      gradientColor="#0a1a3e"
      className="rounded-xl p-8 cursor-pointer w-64 h-48"
    >
      <h3 className="text-lg font-semibold">Blue Theme</h3>
      <p className="mt-2 text-sm text-muted-foreground">Custom gradient colors via props.</p>
    </MagicCard>
  ),
};

export const GreenTheme: Story = {
  render: () => (
    <MagicCard
      gradientFrom="#00B09B"
      gradientTo="#96C93D"
      gradientColor="#0a2010"
      className="rounded-xl p-8 cursor-pointer w-64 h-48"
    >
      <h3 className="text-lg font-semibold">Green Theme</h3>
      <p className="mt-2 text-sm text-muted-foreground">Emerald gradient border on hover.</p>
    </MagicCard>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 w-[640px]">
      {[
        {
          title: "Starter",
          price: "$9",
          features: ["5 projects", "1GB storage"],
        },
        {
          title: "Pro",
          price: "$49",
          features: ["Unlimited projects", "100GB storage"],
        },
        {
          title: "Enterprise",
          price: "Custom",
          features: ["Custom limits", "SLA guarantee"],
        },
      ].map((plan) => (
        <MagicCard key={plan.title} className="rounded-xl p-6 cursor-pointer">
          <div className="font-semibold">{plan.title}</div>
          <div className="mt-2 text-2xl font-bold">{plan.price}</div>
          <div className="mt-4 space-y-2">
            {plan.features.map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3 w-3" />
                {f}
              </div>
            ))}
          </div>
        </MagicCard>
      ))}
    </div>
  ),
};
