import type { Meta, StoryObj } from "@storybook/react";
import { ConsentCard } from "./consent-card";

const meta: Meta<typeof ConsentCard> = {
  title: "Patterns/ConsentCard",
  component: ConsentCard,
  tags: ["autodocs"],
  args: {
    decline: { label: "Essential only", onClick: () => {} },
    accept: { label: "Accept analytics", onClick: () => {} },
    children: (
      <>
        We use essential cookies to run the site, and optional analytics to improve it.{" "}
        <a href="#cookies">Cookie policy</a>
      </>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof ConsentCard>;

export const Default: Story = {};

export const LeftCorner: Story = { args: { corner: "left" } };
