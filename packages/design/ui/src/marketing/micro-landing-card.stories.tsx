import type { Meta, StoryObj } from "@storybook/react";
import { MicroLandingCard } from "./micro-landing-card";

const meta: Meta<typeof MicroLandingCard> = {
  title: "Marketing/MicroLandingCard",
  component: MicroLandingCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Compound component: compose `Hero`, `Context`, `Proof`, and `Action` slots inside the card root.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof MicroLandingCard>;

const content = (
  <>
    <MicroLandingCard.Hero>Ship the boring parts on day one</MicroLandingCard.Hero>
    <MicroLandingCard.Context>
      Auth, billing, and tenancy are wired before you write a feature.
    </MicroLandingCard.Context>
    <MicroLandingCard.Proof>Used by teams shipping to production today</MicroLandingCard.Proof>
    <MicroLandingCard.Action href="#">Start building</MicroLandingCard.Action>
  </>
);

export const Default: Story = { render: () => <MicroLandingCard>{content}</MicroLandingCard> };

export const Primary: Story = {
  render: () => <MicroLandingCard variant="primary">{content}</MicroLandingCard>,
};

export const Compact: Story = {
  render: () => <MicroLandingCard variant="compact">{content}</MicroLandingCard>,
};
