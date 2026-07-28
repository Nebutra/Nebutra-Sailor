import type { Meta, StoryObj } from "@storybook/react";
import { FooterLinkColumn, FooterSocialLinks, SystemStatusButton } from "./footer-links";

const meta: Meta<typeof FooterLinkColumn> = {
  title: "Marketing/FooterLinks",
  component: FooterLinkColumn,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof FooterLinkColumn>;

export const LinkColumn: Story = {
  args: {
    group: {
      title: "Developers",
      links: [
        { title: "Documentation", href: "#" },
        { title: "API reference", href: "#" },
        { title: "Status", href: "#", external: true },
      ],
    },
  },
};

export const SocialLinks: StoryObj<typeof FooterSocialLinks> = {
  render: () => <FooterSocialLinks links={[]} title="Follow along" />,
};

/** Every status the button can report. */
export const StatusButtons: StoryObj<typeof SystemStatusButton> = {
  render: () => (
    <div className="flex flex-col gap-3">
      <SystemStatusButton status="normal" />
      <SystemStatusButton status="degraded" />
      <SystemStatusButton status="outage" />
      <SystemStatusButton status="maintenance" />
    </div>
  ),
};
