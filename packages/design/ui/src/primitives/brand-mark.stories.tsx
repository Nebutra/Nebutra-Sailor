import { Bell, Plus } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { BrandMark } from "./brand-mark";

const meta = {
  title: "Primitives/BrandMark",
  component: BrandMark,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Small branded anchor for AI badges and empty states. It binds the brand role (`--brand-mark`), not the product action color, so skins can restyle it independently of buttons.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["gradient", "soft", "outline"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
    halo: { control: "boolean" },
  },
  args: { variant: "gradient", size: "lg" },
} satisfies Meta<typeof BrandMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <BrandMark {...args} variant="gradient" />
      <BrandMark {...args} variant="soft" />
      <BrandMark {...args} variant="outline" />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <BrandMark {...args} size="sm" />
      <BrandMark {...args} size="md" />
      <BrandMark {...args} size="lg" />
      <BrandMark {...args} size="xl" />
    </div>
  ),
};

export const WithHalo: Story = {
  args: { halo: true, size: "xl" },
};

export const CustomGlyph: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      <BrandMark {...args}>
        <Plus className="size-5" />
      </BrandMark>
      <BrandMark {...args} variant="soft">
        <Bell className="size-5" />
      </BrandMark>
    </div>
  ),
};
