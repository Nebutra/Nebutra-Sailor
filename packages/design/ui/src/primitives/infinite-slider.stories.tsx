import type { Meta, StoryObj } from "@storybook/react";
import { InfiniteSlider } from "./infinite-slider";

const logos = ["Vercel", "Next.js", "React", "TypeScript", "Tailwind", "Prisma", "Supabase"];

const meta = {
  title: "Primitives/InfiniteSlider",
  component: InfiniteSlider,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Continuous auto-scrolling content container. Duplicates children to create a seamless loop. Supports horizontal/vertical directions, speed control, and hover slow-down.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    gap: { control: { type: "range", min: 0, max: 64, step: 4 } },
    duration: { control: { type: "range", min: 5, max: 60, step: 5 } },
    reverse: { control: "boolean" },
    direction: { control: "select", options: ["horizontal", "vertical"] },
  },
} satisfies Meta<typeof InfiniteSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[500px] overflow-hidden">
      <InfiniteSlider gap={32} duration={20}>
        {logos.map((name) => (
          <div
            key={name}
            className="flex h-10 items-center justify-center rounded-md border bg-card px-4 text-sm font-medium"
          >
            {name}
          </div>
        ))}
      </InfiniteSlider>
    </div>
  ),
};

export const SlowOnHover: Story = {
  render: () => (
    <div className="w-[500px] overflow-hidden">
      <InfiniteSlider gap={24} duration={15} durationOnHover={60}>
        {logos.map((name) => (
          <div
            key={name}
            className="flex h-12 items-center justify-center rounded-lg border bg-card px-5 text-sm font-semibold"
          >
            {name}
          </div>
        ))}
      </InfiniteSlider>
    </div>
  ),
};

export const Reverse: Story = {
  render: () => (
    <div className="w-[500px] space-y-4 overflow-hidden">
      <InfiniteSlider gap={24} duration={20}>
        {logos.slice(0, 5).map((name) => (
          <div key={name} className="flex h-10 items-center rounded-md border bg-card px-4 text-sm">
            {name}
          </div>
        ))}
      </InfiniteSlider>
      <InfiniteSlider gap={24} duration={20} reverse>
        {logos.slice(2).map((name) => (
          <div
            key={name}
            className="flex h-10 items-center rounded-md border bg-primary/10 px-4 text-sm"
          >
            {name}
          </div>
        ))}
      </InfiniteSlider>
    </div>
  ),
};

export const SpeedBased: Story = {
  render: () => (
    <div className="w-[500px] overflow-hidden">
      <InfiniteSlider speed={60} speedOnHover={20} gap={24}>
        {logos.map((name) => (
          <div
            key={name}
            className="flex h-10 items-center rounded-full border bg-card px-5 text-sm"
          >
            {name}
          </div>
        ))}
      </InfiniteSlider>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex justify-center">
      <InfiniteSlider direction="vertical" gap={12} duration={10} className="h-48 w-40">
        {logos.map((name) => (
          <div
            key={name}
            className="flex h-10 items-center justify-center rounded-md border bg-card text-sm"
          >
            {name}
          </div>
        ))}
      </InfiniteSlider>
    </div>
  ),
};
