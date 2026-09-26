import { Card } from "@nebutra/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Card> = {
  title: "Layout/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Surface container with a border, background, and subtle shadow. Use `interactive` for clickable cards.",
      },
    },
  },
  argTypes: {
    interactive: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <p className="text-sm font-semibold">Card title</p>
        <p className="mt-1 text-sm text-neutral-500">Supporting description text.</p>
      </div>
    ),
  },
};

export const Interactive: Story = {
  args: {
    interactive: true,
    children: (
      <div>
        <p className="text-sm font-semibold">Interactive card</p>
        <p className="mt-1 text-sm text-neutral-500">Hover to see shadow elevation.</p>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <Card padding="sm">
        <p className="text-sm font-semibold">Default card</p>
        <p className="mt-1 text-sm text-neutral-500">Standard surface container.</p>
      </Card>
      <Card padding="sm" interactive>
        <p className="text-sm font-semibold">Interactive card</p>
        <p className="mt-1 text-sm text-neutral-500">Hover to see elevated shadow.</p>
      </Card>
      <Card className="p-6">
        <p className="text-sm font-semibold">Custom padding</p>
        <p className="mt-1 text-sm text-neutral-500">Extra padding via className override.</p>
      </Card>
    </div>
  ),
};
