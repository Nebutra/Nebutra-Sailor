import type { Meta, StoryObj } from "@storybook/react";
import { Features } from "./Features";

const meta: Meta<typeof Features> = {
  title: "Marketing/Features",
  component: Features,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Features>;

export const Grid: Story = { args: { layout: "grid" } };
export const Bento: Story = { args: { layout: "bento" } };
export const Alternating: Story = { args: { layout: "alternating" } };
export const Tabs: Story = { args: { layout: "tabs" } };

/** Column count only applies to the grid layout. */
export const FourColumns: Story = { args: { layout: "grid", columns: 4 } };
