import type { Meta, StoryObj } from "@storybook/react";
import { Marquee } from "./marquee";

const meta: Meta<typeof Marquee> = {
  title: "Marketing/Marquee",
  component: Marquee,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'Infinite scroller. Defaults to `aria-live="off"` because decorative motion should not be announced; set it deliberately if the content is informational.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Marquee>;

const chips = ["Auth", "Billing", "Tenancy", "Queues", "Search", "Audit", "Vault"].map((label) => (
  <span
    key={label}
    className="mx-2 rounded-[var(--radius-md)] bg-neutral-3 px-4 py-2 text-neutral-11 text-sm"
  >
    {label}
  </span>
));

export const Default: Story = { args: { children: chips } };
export const Reverse: Story = { args: { children: chips, reverse: true } };
export const PauseOnHover: Story = { args: { children: chips, pauseOnHover: true } };
export const Vertical: Story = {
  args: { children: chips, vertical: true },
  decorators: [(Story) => <div className="h-72">{Story()}</div>],
};
