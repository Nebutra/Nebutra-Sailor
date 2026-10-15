import type { Meta, StoryObj } from "@storybook/react";
import { SettingsSectionDemo } from "../catalog/demos/settings-section-demo";
import { SettingsSection } from "./SettingsSection";

const meta: Meta<typeof SettingsSection> = {
  title: "Layout/SettingsSection",
  component: SettingsSection,
  tags: ["autodocs"],
  args: { title: "Organization name", description: "Shown on invoices and invites." },
};
export default meta;

type Story = StoryObj<typeof SettingsSection>;

export const Default: Story = {};

export const AllVariants: Story = { render: () => <SettingsSectionDemo /> };
