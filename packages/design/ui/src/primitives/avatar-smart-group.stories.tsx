import type { Meta, StoryObj } from "@storybook/react";
import { AvatarSmartGroup } from "./avatar-smart-group";

const users = [
  { name: "Ada Lovelace", role: "Engineering" },
  { name: "Grace Hopper", role: "Platform" },
  { name: "Alan Turing", role: "Research" },
  { name: "Margaret Hamilton", role: "Design systems" },
  { name: "Linus Torvalds", role: "Infrastructure" },
];

const meta = {
  title: "Primitives/AvatarSmartGroup",
  component: AvatarSmartGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Overlapping avatar row. Hover or focus an avatar to scale it up and read the name and role in a tooltip.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["uniform", "centered"] },
    size: { control: { type: "range", min: 24, max: 96, step: 4 } },
    overlap: { control: { type: "range", min: -24, max: 8, step: 1 } },
  },
  args: { users, variant: "uniform", size: 48, overlap: -12 },
} satisfies Meta<typeof AvatarSmartGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Uniform: Story = {};

export const Centered: Story = { args: { variant: "centered" } };

export const Compact: Story = { args: { size: 32, overlap: -8 } };

export const Spaced: Story = { args: { overlap: 8 } };
