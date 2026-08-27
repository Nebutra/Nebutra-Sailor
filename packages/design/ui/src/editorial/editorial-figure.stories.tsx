import type { Meta, StoryObj } from "@storybook/react";
import { EditorialFigure, EditorialFigureGroup } from "./editorial-figure";

const meta: Meta<typeof EditorialFigure> = {
  title: "Editorial/Figure",
  component: EditorialFigure,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Image with an optional caption. `media` is a slot so `next/image` stays out of the design package and the block still renders in Storybook.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialFigure>;

const Placeholder = ({ label }: { label: string }) => (
  <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted font-mono text-sm text-muted-foreground">
    {label}
  </div>
);

export const Default: Story = {
  args: {
    media: <Placeholder label="1200 × 675" />,
    caption: "The coordination layer, one level above the agent.",
  },
};

export const Breakout: Story = {
  args: {
    width: "breakout",
    media: <Placeholder label="Breakout width" />,
    caption: "Rich figures earn width by stepping outside the reading column.",
  },
};

export const Group: Story = {
  name: "Figure group",
  render: () => (
    <EditorialFigureGroup label="Before and after" variant="comparison">
      <EditorialFigure media={<Placeholder label="Before" />} caption="Line-shaft factory" />
      <EditorialFigure media={<Placeholder label="After" />} caption="Unit-drive factory" />
    </EditorialFigureGroup>
  ),
};
