import type { Meta, StoryObj } from "@storybook/react";
import { AspectRatio } from "./aspect-ratio";

const meta = {
  title: "Primitives/AspectRatio",
  component: AspectRatio,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Reserves a fixed width-to-height box so media does not shift the layout while it loads.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: { ratio: { control: { type: "number", min: 0.25, max: 4, step: 0.05 } } },
  args: { ratio: 16 / 9 },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ label }: { label: string }) => (
  <div className="flex size-full items-center justify-center rounded-[var(--radius-lg)] border border-border bg-muted text-sm text-muted-foreground">
    {label}
  </div>
);

export const Widescreen: Story = {
  args: { children: <Frame label="16 : 9" /> },
};

export const Square: Story = {
  args: { ratio: 1, children: <Frame label="1 : 1" /> },
};

export const Portrait: Story = {
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
  args: { ratio: 3 / 4, children: <Frame label="3 : 4" /> },
};

export const Ratios: Story = {
  render: () => (
    <div className="grid w-[28rem] grid-cols-3 gap-4">
      {(
        [
          ["1 : 1", 1],
          ["4 : 3", 4 / 3],
          ["16 : 9", 16 / 9],
        ] as const
      ).map(([label, ratio]) => (
        <AspectRatio key={label} ratio={ratio}>
          <Frame label={label} />
        </AspectRatio>
      ))}
    </div>
  ),
};
