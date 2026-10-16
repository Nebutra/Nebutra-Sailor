import { ChartActivity, CreditCard, Lightning, SettingsGear } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import {
  SidebarLogoPlate,
  SidebarSearchButton,
  SidebarUsageMeter,
  SidebarWorkspacePlate,
} from "./sidebar-chrome";
import { SidebarNav } from "./sidebar-nav";

const meta: Meta<typeof SidebarWorkspacePlate> = {
  title: "Patterns/SidebarChrome",
  component: SidebarWorkspacePlate,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof SidebarWorkspacePlate>;

export const WorkspacePlate: Story = {
  args: { name: "Acme Robotics", plan: "Pro" },
  render: (args) => (
    <div className="w-56 bg-sidebar p-3">
      <SidebarWorkspacePlate {...args} />
    </div>
  ),
};

/** The lit plate alone — initials when no logo is passed. */
export const LogoPlate: Story = {
  render: () => (
    <div className="flex gap-3 bg-sidebar p-3">
      <SidebarLogoPlate name="Acme Robotics" />
      <SidebarLogoPlate name="Nebutra" size="sm" />
    </div>
  ),
};

export const SearchButton: Story = {
  render: () => (
    <div className="w-56 space-y-3 bg-sidebar p-3">
      <SidebarSearchButton label="Search or jump to…" />
      <SidebarSearchButton label="Search or jump to…" collapsed />
    </div>
  ),
};

export const UsageMeter: Story = {
  render: () => (
    <div className="w-56 space-y-3 bg-sidebar p-3">
      <SidebarUsageMeter
        plan="Free plan"
        label="Credits this month"
        used={1240}
        limit={5000}
        valueLabel="1,240 / 5,000"
        action={<a href="#upgrade">Upgrade</a>}
      />
      <SidebarUsageMeter
        plan="Pro plan"
        label="Credits"
        used={4820}
        limit={5000}
        valueLabel="96%"
      />
      <SidebarUsageMeter plan="Enterprise" label="Credits" valueLabel="Unmetered" />
    </div>
  ),
};

/** The three pieces in a full rail. */
export const AllVariants: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="h-[640px] w-60 border-r border-sidebar-border bg-sidebar">
      <SidebarNav
        header={
          <div className="flex flex-col gap-3">
            <SidebarWorkspacePlate name="Acme Robotics" plan="Pro" />
            <SidebarSearchButton label="Search or jump to…" />
          </div>
        }
        sections={[
          {
            id: "build",
            label: "Build",
            items: [
              { id: "os", label: "Startup OS", icon: Lightning, href: "#", isActive: true },
              { id: "usage", label: "Usage", icon: ChartActivity, href: "#" },
            ],
          },
          {
            id: "workspace",
            label: "Workspace",
            items: [
              { id: "billing", label: "Billing", icon: CreditCard, href: "#" },
              { id: "settings", label: "Settings", icon: SettingsGear, href: "#" },
            ],
          },
        ]}
        footer={
          <SidebarUsageMeter
            plan="Free plan"
            label="Credits"
            used={1240}
            limit={5000}
            valueLabel="1,240 / 5,000"
            action={<a href="#upgrade">Upgrade</a>}
          />
        }
      />
    </div>
  ),
};
