import type { Meta, StoryObj } from "@storybook/react";
import { Book } from "./book";

const meta = {
  title: "Primitives/Book",
  component: Book,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Decorative 3D book cover for marketing and docs landing pages. It is aria-hidden chrome, so render the real title in a heading beside it.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["stripe", "simple"] },
    width: { control: { type: "range", min: 120, max: 320, step: 4 } },
    textured: { control: "boolean" },
  },
  args: { title: "The Design System Handbook", variant: "stripe", width: 196 },
} satisfies Meta<typeof Book>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stripe: Story = {};

export const Simple: Story = { args: { variant: "simple" } };

export const Branded: Story = {
  args: { color: "var(--primary)", textColor: "var(--primary-foreground)" },
};

export const Shelf: Story = {
  render: () => (
    <div className="flex items-end gap-8">
      <Book title="Foundations" width={140} />
      <Book title="Components" width={164} variant="simple" />
      <Book title="Patterns" width={188} color="var(--accent)" />
    </div>
  ),
};
