import type { Meta, StoryObj } from "@storybook/react";
import { EditorialDivider } from "./editorial-divider";

const meta: Meta<typeof EditorialDivider> = {
  title: "Editorial/Divider",
  component: EditorialDivider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Section break inside an article. Marks a change of movement, not a new heading — a plain rule would read as the end of the piece.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialDivider>;

export const Default: Story = {};

export const BetweenProse: Story = {
  name: "Between prose",
  render: () => (
    <div className="mx-auto max-w-3xl">
      <p className="text-[1.03rem] leading-[1.95] text-muted-foreground">
        People thought they had bought a better engine. Much later, they discovered that what really
        had to change was the structure of the building.
      </p>
      <EditorialDivider />
      <p className="text-[1.03rem] leading-[1.95] text-muted-foreground">
        I start with this story because we are standing at the same kind of crossing. This time, the
        generator everyone brought home is called the Agent.
      </p>
    </div>
  ),
};
