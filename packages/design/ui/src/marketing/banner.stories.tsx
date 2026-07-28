import type { Meta, StoryObj } from "@storybook/react";
import { Banner } from "./banner";

const meta: Meta<typeof Banner> = {
  title: "Marketing/Banner",
  component: Banner,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Banner>;

const noop = () => {};

export const Default: Story = {
  args: {
    show: true,
    onHide: noop,
    title: "v2 is out — schema changes are opt-in",
    action: { label: "See what shipped", onClick: noop },
  },
};

export const WithLearnMore: Story = {
  args: {
    show: true,
    onHide: noop,
    title: "Scheduled maintenance on Sunday 02:00 UTC",
    action: { label: "Details", onClick: noop },
    learnMoreUrl: "#",
  },
};

/** Hidden — the dismissed state callers keep in their own store. */
export const Hidden: Story = {
  args: { show: false, onHide: noop, title: "Not rendered", action: { label: "—", onClick: noop } },
};
