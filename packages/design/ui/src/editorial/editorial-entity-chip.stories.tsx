import type { Meta, StoryObj } from "@storybook/react";
import { EditorialEntityChip } from "./editorial-entity-chip";

const meta: Meta<typeof EditorialEntityChip> = {
  title: "Editorial/EntityChip",
  component: EditorialEntityChip,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Inline reference to a company, product or project. Sized in `em` so it never changes the line height of the sentence it sits in.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialEntityChip>;

export const Default: Story = {
  args: { name: "Cursor", href: "https://cursor.com" },
};

export const InSentence: Story = {
  name: "In a sentence",
  render: () => (
    <p className="max-w-2xl text-[1.03rem] leading-[1.95] text-muted-foreground">
      When{" "}
      <EditorialEntityChip
        name="Cursor"
        href="https://cursor.com"
        logo={<span className="text-[0.7em] font-semibold">C</span>}
      />{" "}
      first launched, the models were not strong enough to support its vision. Only after{" "}
      <EditorialEntityChip name="Claude 3.5 Sonnet" /> arrived did it become a truly useful product
      — the same pattern <EditorialEntityChip name="Vercel" href="https://vercel.com" /> followed a
      decade earlier.
    </p>
  ),
};

export const WithoutLink: Story = {
  name: "Without link",
  args: { name: "Claude 3.5 Sonnet" },
};
