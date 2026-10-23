import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroupCard, RadioGroupCardItem } from "./radio-group-card";

const meta = {
  title: "Primitives/RadioGroupCard",
  component: RadioGroupCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Radio group where each choice is a selectable card. Selection adds a ring on top of the border; arrow keys move between cards.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const plans = [
  { value: "free", title: "Free", note: "For trying things out" },
  { value: "pro", title: "Pro", note: "For production teams" },
  { value: "scale", title: "Scale", note: "For large organisations" },
];

export const Default: Story = {
  render: (args) => (
    <RadioGroupCard {...args} defaultValue="pro" aria-label="Plan" className="grid-cols-3">
      {plans.map((plan) => (
        <RadioGroupCardItem key={plan.value} value={plan.value} className="w-36 gap-1">
          <span className="text-sm font-medium text-foreground">{plan.title}</span>
          <span className="text-center text-xs text-muted-foreground">{plan.note}</span>
        </RadioGroupCardItem>
      ))}
    </RadioGroupCard>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <RadioGroupCard
      {...args}
      disabled
      defaultValue="free"
      aria-label="Plan"
      className="grid-cols-3"
    >
      {plans.map((plan) => (
        <RadioGroupCardItem key={plan.value} value={plan.value} className="w-36 gap-1">
          <span className="text-sm font-medium text-foreground">{plan.title}</span>
        </RadioGroupCardItem>
      ))}
    </RadioGroupCard>
  ),
};
